import chokidar from 'chokidar';
import path from 'node:path';
import { SOURCES } from './sources.js';

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

export function startWatchers(log) {
  for (const src of SOURCES) {
    const watcher = chokidar.watch(src.root, {
      ignored: IGNORED,
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      followSymlinks: true,
      depth: 10,
    });
    const relTo = (abs) => path.relative(src.root, abs);
    watcher
      .on('add', (abs) => {
        broadcast({ type: 'add', source: src.id, path: relTo(abs), ts: Date.now() });
        scheduleRebuild();
      })
      .on('change', (abs) => {
        broadcast({ type: 'change', source: src.id, path: relTo(abs), ts: Date.now() });
        scheduleRebuild();
      })
      .on('unlink', (abs) => {
        broadcast({ type: 'unlink', source: src.id, path: relTo(abs), ts: Date.now() });
        scheduleRebuild();
      })
      .on('error', (err) => log?.warn({ err, source: src.id }, 'watcher error'));
    log?.info(`watching ${src.id}: ${src.root}`);
  }
}
