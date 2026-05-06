import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { resolveCustomPath } from './custom-sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function safeRealpath(p) {
  try { return fs.realpathSync(p); } catch { return null; }
}

// 环境变量可覆盖（Electron 打包后由 main.cjs 设置到用户机器上实际的 data 目录）
const DATA_DIR = process.env.KB_DATA_DIR || path.join(repoRoot, 'data');

function buildSource(id, kind, label, color, displayPath) {
  const root = path.join(DATA_DIR, id);
  return {
    id,
    kind,
    label,
    color,
    root,
    realRoot: safeRealpath(root) || root,
    displayPath,
    multi: false,
  };
}

// custom 源：第 4 源，内部多挂载点。root/realRoot 是虚拟占位，仅用于 SOURCES 表统一性。
const CUSTOM_VIRTUAL_ROOT = path.join(DATA_DIR, '__custom__');
const customSource = {
  id: 'custom',
  kind: 'custom',
  label: '自定义来源',
  color: '#4A8B5E',
  root: CUSTOM_VIRTUAL_ROOT,
  realRoot: CUSTOM_VIRTUAL_ROOT,
  displayPath: '~/.kb-dashboard/custom-sources.json',
  multi: true,
};

export const SOURCES = [
  buildSource('learn', 'learn', '学习项目', '#3766B8', '~/Desktop/文档/个人学习项目/'),
  buildSource('obsidian', 'obsidian', 'Obsidian 知识库', '#7A5AB8', '~/Desktop/文档/个人知识库/'),
  buildSource('work', 'work', '公司项目笔记', '#C77A35', '~/work/code/sanwan/notes/'),
  customSource,
];

export const SOURCES_BY_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

// 通用忽略：系统/构建产物/敏感目录
export const DEFAULT_IGNORE = [
  '**/.git/**',
  '**/.DS_Store',
  '**/node_modules/**',
  '**/target/**',
  '**/dist/**',
  '**/.vite/**',
  '**/.claude/**',
  '**/.codex_tmp/**',
  '**/.obsidian/**',
  '**/.trash/**',
  '**/*_副本/**',
];

// 路径安全：防止 `path=..` 之类穿透出源根
// custom 源走多挂载点解析（path 第一段为 mountId）。
export function safeResolve(sourceId, rel = '') {
  const src = SOURCES_BY_ID[sourceId];
  if (!src) {
    const err = new Error(`unknown source: ${sourceId}`);
    err.statusCode = 400;
    throw err;
  }
  if (src.multi) {
    const normalized = String(rel || '').replace(/^[/\\]+/, '');
    if (!normalized) {
      const err = new Error('custom 源访问需要 path 指定挂载点（mountId/...）');
      err.statusCode = 400;
      throw err;
    }
    const r = resolveCustomPath(normalized);
    return { source: src, abs: r.abs, rel: normalized, mount: r.mount };
  }
  const normalizedRel = rel.replace(/^[/\\]+/, '');
  const abs = path.resolve(src.root, normalizedRel);
  const rootAbs = path.resolve(src.root);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) {
    const err = new Error(`path escape: ${rel}`);
    err.statusCode = 400;
    throw err;
  }
  return { source: src, abs, rel: path.relative(rootAbs, abs) };
}
