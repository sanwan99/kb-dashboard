import chokidar from 'chokidar';
import path from 'node:path';
import fs from 'node:fs';
import { SOURCES } from './sources.js';
import { listMounts, onMountChange } from './custom-sources.js';
import { isReadableTextExt } from './file-types.js';

const IGNORED = [
  /(^|[\/\\])\../,        // 点开头：.git .obsidian .DS_Store 等
  /\/node_modules\//,
  /\/target\//,
  /\/dist\//,
  /\/\.vite\//,
  /\/\.trash\//,
  /_副本\//,
  /(?:^|[\/\\])ai全局管理(?:[\/\\]|$)/,
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

// 索引（search / obsidian / readableDirs）重建完成后广播。前端可借此触发"重拉所有已展开 tree"等
// 依赖索引数据的 UI 更新——典型 corner case：用户在新空目录里立即放 md，SSE add 事件比
// 索引重建快到达，前端立刻重拉 tree 时 readableDirs 还是旧的，新目录被过滤掉。
export function broadcastReindex() {
  broadcast({ type: 'reindex', ts: Date.now() });
}

// 批量"索引可能需要重建"回调（防抖 5s）
let rebuildTimer = null;
let onRebuild = null;
let pendingFullRebuild = false;
let pendingEvents = [];
export function setRebuildHandler(fn) { onRebuild = fn; }
function isReadableEvent(kind, relPath) {
  if (kind === 'dir') return true;
  const ext = path.extname(String(relPath || '')).slice(1).toLowerCase();
  return isReadableTextExt(ext);
}
function scheduleRebuild(evt = null) {
  if (evt) {
    if (!isReadableEvent(evt.kind, evt.path)) return;
    pendingEvents.push(evt);
  } else {
    pendingFullRebuild = true;
  }
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    const batch = {
      full: pendingFullRebuild,
      events: pendingEvents,
    };
    pendingFullRebuild = false;
    pendingEvents = [];
    if (onRebuild && (batch.full || batch.events.length > 0)) {
      onRebuild(batch).catch(() => {});
    }
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
    .on('addDir', (abs) => {
      const evt = { type: 'add', kind: 'dir', source: broadcastSource, path: relTo(abs), ts: Date.now() };
      broadcast(evt);
      scheduleRebuild(evt);
    })
    .on('add', (abs) => {
      const evt = { type: 'add', kind: 'file', source: broadcastSource, path: relTo(abs), ts: Date.now() };
      broadcast(evt);
      scheduleRebuild(evt);
    })
    .on('change', (abs) => {
      const evt = { type: 'change', kind: 'file', source: broadcastSource, path: relTo(abs), ts: Date.now() };
      broadcast(evt);
      scheduleRebuild(evt);
    })
    .on('unlink', (abs) => {
      const evt = { type: 'unlink', kind: 'file', source: broadcastSource, path: relTo(abs), ts: Date.now() };
      broadcast(evt);
      scheduleRebuild(evt);
    })
    .on('unlinkDir', (abs) => {
      const evt = { type: 'unlink', kind: 'dir', source: broadcastSource, path: relTo(abs), ts: Date.now() };
      broadcast(evt);
      scheduleRebuild(evt);
    })
    .on('error', (err) => log?.warn({ err, source: broadcastSource }, 'watcher error'));
  return watcher;
}

/** 给一个 custom 挂载点附加 watcher。挂载点不可用时跳过。 */
export function addMountWatch(mount, log, { rebuild = true } = {}) {
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
  if (rebuild) scheduleRebuild();
}

/** 解除一个 custom 挂载点的 watcher。 */
export function removeMountWatch(mountId, log, { rebuild = true } = {}) {
  const item = customWatchers.get(mountId);
  if (!item) return;
  try { item.watcher.close(); } catch { /* ignore */ }
  customWatchers.delete(mountId);
  log?.info(`unwatching custom/${mountId}`);
  if (rebuild) scheduleRebuild();
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
    addMountWatch(m, log, { rebuild: false });
  }
  // 监听挂载列表变化
  onMountChange((evt) => {
    if (evt.type === 'add' && evt.mount) {
      addMountWatch(evt.mount, log, { rebuild: false });
    } else if (evt.type === 'remove' && evt.mount) {
      removeMountWatch(evt.mount.id, log, { rebuild: false });
    }
    // rename / reorder 不影响 watcher 拓扑
  });
}
