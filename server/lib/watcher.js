import chokidar from 'chokidar';
import path from 'node:path';
import fs from 'node:fs';
import { SOURCES } from './sources.js';
import { listMounts, onMountChange } from './custom-sources.js';

const IGNORED = [
  /(^|[\/\\])\../,        // 点开头：.git .obsidian .DS_Store 等
  /\/node_modules\//,
  /\/target\//,
  /\/dist\//,
  /\/\.vite\//,
  /\/\.trash\//,
  /_副本\//,
];

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function broadcast(evt) {
  for (const fn of listeners) {
    try { fn(evt); } catch { /* 客户端断开 */ }
  }
}

// 索引（search / obsidian / mdDirs）重建完成后广播。前端可借此触发"重拉所有已展开 tree"等
// 依赖索引数据的 UI 更新——典型 corner case：用户在新空目录里立即放 md，SSE add 事件比
// 索引重建快到达，前端立刻重拉 tree 时 mdDirs 还是旧的，新目录被过滤掉。
export function broadcastReindex() {
  broadcast({ type: 'reindex', ts: Date.now() });
}

// 批量"索引可能需要重建"回调（防抖 5s）
let rebuildTimer = null;
let onRebuild = null;
export function setRebuildHandler(fn) { onRebuild = fn; }
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    if (onRebuild) onRebuild().catch(() => {});
  }, 5000);
}

// custom 挂载点的 watcher 实例：mountId -> { watcher, mount }
const customWatchers = new Map();

function attachWatcher(rootAbs, broadcastSource, broadcastPathPrefix, log) {
  const watcher = chokidar.watch(rootAbs, {
    ignored: IGNORED,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
    followSymbolicLinks: true,
    depth: 10,
  });
  const relTo = (abs) => {
    const rel = path.relative(rootAbs, abs);
    return broadcastPathPrefix ? path.posix.join(broadcastPathPrefix, rel.split(path.sep).join('/')) : rel;
  };
  watcher
    .on('add', (abs) => {
      broadcast({ type: 'add', source: broadcastSource, path: relTo(abs), ts: Date.now() });
      scheduleRebuild();
    })
    .on('change', (abs) => {
      broadcast({ type: 'change', source: broadcastSource, path: relTo(abs), ts: Date.now() });
      scheduleRebuild();
    })
    .on('unlink', (abs) => {
      broadcast({ type: 'unlink', source: broadcastSource, path: relTo(abs), ts: Date.now() });
      scheduleRebuild();
    })
    .on('error', (err) => log?.warn({ err, source: broadcastSource }, 'watcher error'));
  return watcher;
}

/** 给一个 custom 挂载点附加 watcher。挂载点不可用时跳过。 */
export function addMountWatch(mount, log) {
  if (!mount?.id || !mount.realRoot) return;
  if (customWatchers.has(mount.id)) return; // 已存在
  let exists = false;
  try { exists = fs.statSync(mount.realRoot).isDirectory(); } catch { exists = false; }
  if (!exists) {
    log?.warn({ mountId: mount.id, root: mount.realRoot }, 'custom mount unavailable, skip watch');
    return;
  }
  const watcher = attachWatcher(mount.realRoot, 'custom', mount.id, log);
  customWatchers.set(mount.id, { watcher, mount });
  log?.info(`watching custom/${mount.id}: ${mount.realRoot}`);
  scheduleRebuild();
}

/** 解除一个 custom 挂载点的 watcher。 */
export function removeMountWatch(mountId, log) {
  const item = customWatchers.get(mountId);
  if (!item) return;
  try { item.watcher.close(); } catch { /* ignore */ }
  customWatchers.delete(mountId);
  log?.info(`unwatching custom/${mountId}`);
  scheduleRebuild();
}

export function startWatchers(log) {
  // 内置三源
  for (const src of SOURCES) {
    if (src.multi) continue;
    attachWatcher(src.root, src.id, '', log);
    log?.info(`watching ${src.id}: ${src.root}`);
  }
  // custom 已有挂载点
  for (const m of listMounts()) {
    addMountWatch(m, log);
  }
  // 监听挂载列表变化
  onMountChange((evt) => {
    if (evt.type === 'add' && evt.mount) {
      addMountWatch(evt.mount, log);
    } else if (evt.type === 'remove' && evt.mount) {
      removeMountWatch(evt.mount.id, log);
    }
    // rename / reorder 不影响 watcher 拓扑
  });
}
