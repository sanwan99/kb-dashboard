import fs from 'node:fs/promises';
import path from 'node:path';

const IGNORE_NAMES = new Set([
  '.git', '.DS_Store', 'node_modules', 'target', 'dist',
  '.vite', '.claude', '.codex_tmp', '.obsidian', '.trash',
]);

const isIgnored = (name) => {
  if (IGNORE_NAMES.has(name)) return true;
  if (name.endsWith('_副本')) return true;
  return false;
};

/**
 * 列出一个目录的一级子项，不递归。
 * 返回：[{ name, type: 'dir' | 'file', size, mtime, ext }]
 * 点开目录再发请求拿子级（Obsidian 左栏就是这种交互）。
 */
export async function listDir(absDir, relFromRoot) {
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (isIgnored(ent.name)) continue;
    const abs = path.join(absDir, ent.name);
    let type;
    let stat = null;
    if (ent.isSymbolicLink()) {
      try {
        stat = await fs.stat(abs);
        type = stat.isDirectory() ? 'dir' : 'file';
      } catch {
        continue;
      }
    } else if (ent.isDirectory()) {
      type = 'dir';
    } else if (ent.isFile()) {
      type = 'file';
    } else {
      continue;
    }
    if (!stat) {
      try { stat = await fs.stat(abs); } catch { continue; }
    }
    const rel = relFromRoot ? path.join(relFromRoot, ent.name) : ent.name;
    out.push({
      name: ent.name,
      type,
      path: rel,
      size: type === 'file' ? stat.size : null,
      mtime: stat.mtime.toISOString(),
      ext: type === 'file' ? path.extname(ent.name).slice(1).toLowerCase() : null,
    });
  }
  // 目录在前，按 name 排
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });
  return out;
}
