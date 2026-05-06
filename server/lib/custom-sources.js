// 自定义来源（custom 源）：用户自助引入的多个本地目录，作为第 4 源 `custom` 内部挂载。
// 配置文件：~/.kb-dashboard/custom-sources.json
// 数据形态：{ version: 1, items: [{ id, name, root, realRoot, addedAt }] }
// 边界：仅维护元数据；不写入挂载点目录本身（坚守"只读"硬约束）。

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

import { SOURCES } from './sources.js';

const CONFIG_DIR = path.join(os.homedir(), '.kb-dashboard');
const CONFIG_PATH = path.join(CONFIG_DIR, 'custom-sources.json');

const listeners = new Set();

/** 注册挂载点变更回调。回调签名：(evt) => void
 *  evt: { type: 'add'|'remove'|'rename'|'reorder', mount? }
 */
export function onMountChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify(evt) {
  for (const fn of listeners) {
    try { fn(evt); } catch { /* 忽略单个监听器异常 */ }
  }
}

let cache = null;

function loadConfig() {
  if (cache) return cache;
  try {
    const buf = fs.readFileSync(CONFIG_PATH, 'utf8');
    const j = JSON.parse(buf);
    cache = { version: 1, items: Array.isArray(j.items) ? j.items : [] };
  } catch {
    cache = { version: 1, items: [] };
  }
  return cache;
}

function saveConfig() {
  if (!cache) cache = { version: 1, items: [] };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tmp = CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8');
  fs.renameSync(tmp, CONFIG_PATH);
}

function expandHome(p) {
  if (!p) return p;
  if (p === '~') return os.homedir();
  if (p.startsWith('~/')) return path.join(os.homedir(), p.slice(2));
  return p;
}

function shortId(seed) {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10);
}

function err(code, msg) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

function checkOverlapWithBuiltin(realRoot) {
  for (const s of SOURCES) {
    if (s.multi) continue; // 跳过 custom 自身（虚拟根）
    if (!s.realRoot) continue;
    if (realRoot === s.realRoot) {
      return `引入的目录与内置源 "${s.id}" 完全相同（${s.realRoot}）`;
    }
    if (realRoot.startsWith(s.realRoot + path.sep)) {
      return `引入的目录是内置源 "${s.id}" 的子目录（${s.realRoot}）`;
    }
    if (s.realRoot.startsWith(realRoot + path.sep)) {
      return `引入的目录包含内置源 "${s.id}"（${s.realRoot}）`;
    }
  }
  return null;
}

function checkOverlapWithExisting(realRoot, items, excludeId = null) {
  for (const it of items) {
    if (excludeId && it.id === excludeId) continue;
    if (!it.realRoot) continue;
    if (realRoot === it.realRoot) {
      return `已存在同一目录的挂载："${it.name}"`;
    }
    if (realRoot.startsWith(it.realRoot + path.sep)) {
      return `引入的目录是已有挂载 "${it.name}" 的子目录`;
    }
    if (it.realRoot.startsWith(realRoot + path.sep)) {
      return `引入的目录包含已有挂载 "${it.name}"`;
    }
  }
  return null;
}

function defaultName(realRoot) {
  const base = path.basename(realRoot);
  return base || realRoot;
}

/** 列出所有挂载点。附带 available 标记（fs.existsSync）。
 *  返回数据用于前端 / sources.js / watcher / search。
 */
export function listMounts() {
  const cfg = loadConfig();
  return cfg.items.map((it) => ({
    id: it.id,
    name: it.name,
    root: it.root,
    realRoot: it.realRoot,
    addedAt: it.addedAt,
    available: safeExists(it.realRoot),
  }));
}

function safeExists(p) {
  try {
    const st = fs.statSync(p);
    return st.isDirectory();
  } catch { return false; }
}

/** 按 id 取一个挂载点（available 标记同 listMounts）。 */
export function getMount(id) {
  return listMounts().find((m) => m.id === id) || null;
}

/** 新增一个挂载点。
 *  body: { path: string, name?: string }
 *  约束：path 必须是绝对路径（或 ~ 起头）；目录必须存在；不与三源 / 已有挂载重叠。
 */
export function addMount({ path: rawPath, name } = {}) {
  if (!rawPath || typeof rawPath !== 'string') {
    throw err(400, '需要提供 path 字段');
  }
  const expanded = expandHome(rawPath.trim());
  if (!path.isAbsolute(expanded)) {
    throw err(400, `path 必须是绝对路径：${rawPath}`);
  }
  let stat;
  try {
    stat = fs.statSync(expanded);
  } catch (e) {
    if (e.code === 'ENOENT') throw err(400, `路径不存在：${expanded}`);
    throw err(400, `无法访问路径：${expanded}（${e.code || e.message}）`);
  }
  if (!stat.isDirectory()) {
    throw err(400, `路径不是目录：${expanded}`);
  }
  let realRoot;
  try {
    realRoot = fs.realpathSync(expanded);
  } catch {
    realRoot = expanded;
  }

  const cfg = loadConfig();

  const builtinOverlap = checkOverlapWithBuiltin(realRoot);
  if (builtinOverlap) throw err(409, builtinOverlap);

  const existingOverlap = checkOverlapWithExisting(realRoot, cfg.items);
  if (existingOverlap) throw err(409, existingOverlap);

  const trimmedName = (name || '').trim();
  const finalName = trimmedName || defaultName(realRoot);
  const id = shortId(realRoot + ':' + Date.now());

  const item = {
    id,
    name: finalName,
    root: expanded,
    realRoot,
    addedAt: new Date().toISOString(),
  };
  cfg.items.push(item);
  saveConfig();

  const mount = { ...item, available: true };
  notify({ type: 'add', mount });
  return mount;
}

/** 删除一个挂载点。返回 true 表示有命中。 */
export function removeMount(id) {
  const cfg = loadConfig();
  const idx = cfg.items.findIndex((it) => it.id === id);
  if (idx === -1) return false;
  const [removed] = cfg.items.splice(idx, 1);
  saveConfig();
  notify({ type: 'remove', mount: { ...removed, available: false } });
  return true;
}

/** 重命名一个挂载点。 */
export function renameMount(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw err(400, '名称不能为空');
  const cfg = loadConfig();
  const item = cfg.items.find((it) => it.id === id);
  if (!item) return null;
  item.name = trimmed;
  saveConfig();
  const mount = { ...item, available: safeExists(item.realRoot) };
  notify({ type: 'rename', mount });
  return mount;
}

/** 按给定的 id 顺序重排。未列出的项保持原相对顺序追加在后。 */
export function reorderMounts(idArray) {
  if (!Array.isArray(idArray)) throw err(400, 'order 必须是字符串数组');
  const cfg = loadConfig();
  const idx = new Map(cfg.items.map((it, i) => [it.id, i]));
  const seen = new Set();
  const next = [];
  for (const id of idArray) {
    if (typeof id !== 'string') continue;
    if (seen.has(id)) continue;
    if (!idx.has(id)) continue;
    seen.add(id);
    next.push(cfg.items[idx.get(id)]);
  }
  for (const it of cfg.items) {
    if (!seen.has(it.id)) next.push(it);
  }
  cfg.items = next;
  saveConfig();
  notify({ type: 'reorder' });
  return listMounts();
}

/** safeResolve('custom', ...) 用：解析 path 第一段为 mountId，剩下走真实 fs。
 *  返回 { mount, abs, rel }；rel 是相对挂载点（不含 mountId 前缀）。
 *  防穿透：realpath 后强制 startsWith(mount.realRoot)。
 */
export function resolveCustomPath(rel = '') {
  const normalized = String(rel).replace(/^[/\\]+/, '');
  if (!normalized) {
    // path 为空时由调用方处理（用于返回挂载列表的虚拟根）
    return { mount: null, abs: null, rel: '' };
  }
  const segs = normalized.split('/');
  const mountId = segs[0];
  const rest = segs.slice(1).join('/');
  const mount = getMount(mountId);
  if (!mount) {
    throw err(404, `挂载点不存在：${mountId}`);
  }
  const baseAbs = path.resolve(mount.realRoot);
  const abs = path.resolve(baseAbs, rest);
  if (abs !== baseAbs && !abs.startsWith(baseAbs + path.sep)) {
    throw err(400, `path escape: ${rel}`);
  }
  const relFromMount = path.relative(baseAbs, abs);
  return { mount, abs, rel: relFromMount };
}
