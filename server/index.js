import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';

import { SOURCES, SOURCES_BY_ID, RETIRED_SOURCES, safeResolve } from './lib/sources.js';
import { listDir } from './lib/tree.js';
import { renderMarkdown } from './lib/markdown.js';
import { buildHomeOverview, listRecent } from './lib/stats.js';
import { ensureSearchIndex, markSearchDirty, searchIndex, searchStats, getCustomMountReadableDirs } from './lib/search.js';
import { startWatchers, subscribe, setRebuildHandler, addMountWatch, removeMountWatch, broadcastReindex } from './lib/watcher.js';
import {
  listMounts as listCustomMounts,
  addMount as addCustomMount,
  removeMount as removeCustomMount,
  renameMount as renameCustomMount,
  reorderMounts as reorderCustomMounts,
  getMount as getCustomMount,
} from './lib/custom-sources.js';
import { guessMime, IMAGE_EXTS } from './lib/mime.js';
import { isMarkdownExt, isReadableTextExt, renderCodeHtml } from './lib/file-types.js';
import { movePathToTrash } from './lib/trash.js';

const PORT = Number(process.env.PORT || 5174);
const HOST = '127.0.0.1';
const execFileAsync = promisify(execFile);

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// GET /api/sources — 项目文档与本地目录元信息
app.get('/api/sources', async () => {
  const out = [];
  for (const s of SOURCES) {
    if (s.multi) {
      const mounts = listCustomMounts();
      out.push({
        id: s.id,
        kind: s.kind,
        label: s.label,
        color: s.color,
        root: s.root,
        realRoot: s.realRoot,
        displayPath: s.displayPath,
        multi: true,
        mounts,
        exists: mounts.length > 0,
        fileCount: null,
      });
      continue;
    }
    let exists = true;
    try {
      await fs.access(s.root);
    } catch {
      exists = false;
    }
    out.push({
      id: s.id,
      kind: s.kind,
      label: s.label,
      color: s.color,
      root: s.root,
      realRoot: s.realRoot,
      displayPath: s.displayPath,
      multi: false,
      exists,
      fileCount: null,
    });
  }
  return { sources: out };
});

// ── custom-sources 管理 ────────────────────────────────────────
// 所有写操作只动 ~/.kb-dashboard/custom-sources.json，不写挂载点目录本身。

app.get('/api/custom-sources', async () => ({ items: listCustomMounts() }));

app.post('/api/custom-sources', async (req, reply) => {
  const body = req.body || {};
  try {
    const mount = addCustomMount(body);
    addMountWatch?.(mount, app.log, { rebuild: false });
    markSearchDirty();
    broadcastReindex();
    return mount;
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ error: err.message });
  }
});

app.patch('/api/custom-sources/:id', async (req, reply) => {
  const { id } = req.params;
  const body = req.body || {};
  try {
    if (body.order !== undefined) {
      // 整体重排：body.order 是 id 数组
      const items = reorderCustomMounts(body.order);
      return { items };
    }
    if (body.name !== undefined) {
      const mount = renameCustomMount(id, body.name);
      if (!mount) return reply.code(404).send({ error: '挂载点不存在' });
      return mount;
    }
    return reply.code(400).send({ error: '需要提供 name 或 order 字段' });
  } catch (err) {
    return reply.code(err.statusCode || 400).send({ error: err.message });
  }
});

app.delete('/api/custom-sources/:id', async (req, reply) => {
  const { id } = req.params;
  const ok = removeCustomMount(id);
  if (!ok) return reply.code(404).send({ error: '挂载点不存在' });
  removeMountWatch?.(id, app.log, { rebuild: false });
  markSearchDirty();
  broadcastReindex();
  return { ok: true, id };
});

// GET /api/tree?source=...&path=... — 单级目录列表（点开再发下一级）
// custom 源 path='' 时返回挂载列表（虚拟根）；path='<mountId>/...' 走真实 fs。
app.get('/api/tree', async (req, reply) => {
  const { source, path: p = '' } = req.query;
  if (!source) return reply.code(400).send({ error: 'source required' });
  try {
    if (source === 'custom' && (!p || p === '/')) {
      const mounts = listCustomMounts();
      const entries = mounts.map((m) => ({
        name: m.name,
        type: 'dir',
        path: m.id,
        size: null,
        mtime: m.addedAt || null,
        ext: null,
        mountId: m.id,
        available: m.available,
        realRoot: m.realRoot,
      }));
      return { source, path: '', entries, mounts: true };
    }
    const { abs, rel } = safeResolve(source, p);
    const stat = await fs.stat(abs);
    if (!stat.isDirectory()) {
      return reply.code(400).send({ error: 'not a directory' });
    }
    let entries = await listDir(abs, rel);
    // custom 源：用户引入的目录可能很杂（csv / pdf / zip 等），只显示可读文件 + "递归含可读文件"的目录。
    // 复用 search 索引一次性构建好的 readableDirs 集合，O(1) 查表过滤；索引未就绪时退化为"只过滤文件"。
    // 项目文档保留完整目录。
    if (source === 'custom') {
      const segs = String(p || '').split('/').filter(Boolean);
      const mountId = segs[0];
      const dirInMount = segs.slice(1).join('/'); // 相对挂载点的当前目录
      const stats = searchStats();
      if (mountId && stats.ready && !stats.dirty) {
        const readableDirs = getCustomMountReadableDirs(mountId);
        if (readableDirs) {
          entries = entries.filter((e) => {
            if (isReadableTextExt(e.ext)) return true;
            if (e.type !== 'dir') return false;
            const dirRel = dirInMount ? `${dirInMount}/${e.name}` : e.name;
            return readableDirs.has(dirRel);
          });
        } else {
          entries = entries.filter((e) => e.type === 'dir' || isReadableTextExt(e.ext));
        }
      } else {
        // 索引未就绪：保守只过滤掉非可读文件，目录都保留
        entries = entries.filter((e) => e.type === 'dir' || isReadableTextExt(e.ext));
      }
    }
    return { source, path: rel, entries };
  } catch (err) {
    req.log.warn({ err }, 'tree failed');
    return reply.code(err.statusCode || (err.code === 'ENOENT' ? 404 : 500)).send({ error: err.message });
  }
});

// GET /api/file?source=...&path=... — 文件内容 + 渲染 HTML + frontmatter
app.get('/api/file', async (req, reply) => {
  const { source, path: p } = req.query;
  if (!source || !p) return reply.code(400).send({ error: 'source and path required' });
  try {
    const { abs, rel, source: src } = safeResolve(source, p);
    const stat = await fs.stat(abs);
    if (!stat.isFile()) return reply.code(400).send({ error: 'not a file' });

    const ext = path.extname(abs).slice(1).toLowerCase();
    if (isReadableTextExt(ext) && stat.size > Number(process.env.KB_PREVIEW_MAX_FILE_BYTES || 5_000_000)) {
      return reply.code(413).send({ error: '文件较大，请在本地编辑器中打开。', size: stat.size });
    }
    const buf = await fs.readFile(abs);

    if (isMarkdownExt(ext)) {
      const raw = buf.toString('utf8');
      const { html, meta, raw: content } = renderMarkdown(raw, { source: src.id, filePath: rel });
      return {
        source: src.id,
        path: rel,
        ext,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        meta,
        html,
        raw: content,
      };
    }

    if (isReadableTextExt(ext)) {
      const raw = buf.toString('utf8');
      return {
        source: src.id,
        path: rel,
        ext,
        size: stat.size,
        mtime: stat.mtime.toISOString(),
        meta: null,
        html: renderCodeHtml(raw, ext),
        raw,
        binary: false,
      };
    }

    return {
      source: src.id,
      path: rel,
      ext,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      binary: true,
    };
  } catch (err) {
    req.log.warn({ err }, 'file failed');
    return reply.code(err.statusCode || (err.code === 'ENOENT' ? 404 : 500)).send({ error: err.code === 'ENOENT' ? '文件已移动或不存在，请从所在目录重新选择。' : err.message });
  }
});

// GET /api/blob?source=...&path=... — 二进制流（图片等）
app.get('/api/blob', async (req, reply) => {
  const { source, path: p } = req.query;
  if (!source || !p) return reply.code(400).send({ error: 'source and path required' });
  try {
    const { abs } = safeResolve(source, p);
    const stat = await fs.stat(abs);
    if (!stat.isFile()) return reply.code(400).send({ error: 'not a file' });
    const ext = path.extname(abs).slice(1).toLowerCase();
    reply.header('Content-Type', guessMime(ext));
    reply.header('Content-Length', stat.size);
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(createReadStream(abs));
  } catch (err) {
    req.log.warn({ err }, 'blob failed');
    return reply.code(err.statusCode || 500).send({ error: err.message });
  }
});

function isWithinRoot(realPath, realRoot) {
  const root = path.resolve(realRoot);
  return realPath === root || realPath.startsWith(root + path.sep);
}

function reject(code, message) {
  const err = new Error(message);
  err.statusCode = code;
  return err;
}

// POST /api/file/trash — 将四源内的单个文件或目录移到 macOS 系统废纸篓。
// 只接收 source + path；禁止 absPath，必须经 safeResolve，且拒绝删除来源根 / custom 挂载根。
app.post('/api/file/trash', async (req, reply) => {
  const body = req.body || {};
  const { source, path: relPath } = body;

  if (!source) return reply.code(400).send({ error: 'source required' });
  if (typeof relPath !== 'string' || !relPath.trim()) {
    return reply.code(400).send({ error: 'path required' });
  }

  try {
    const resolved = safeResolve(source, relPath);
    const abs = path.resolve(resolved.abs);
    const srcRoot = path.resolve(resolved.source.root);

    if (!resolved.source.multi && abs === srcRoot) {
      throw reject(400, '禁止删除来源根目录');
    }
    if (resolved.source.multi && resolved.mount && abs === path.resolve(resolved.mount.realRoot)) {
      throw reject(400, '禁止删除 custom 挂载根目录');
    }

    let stat;
    try {
      stat = await fs.lstat(abs);
    } catch (err) {
      if (err.code === 'ENOENT') throw reject(404, '文件或目录不存在');
      throw err;
    }

    const allowedRoot = resolved.source.multi
      ? resolved.mount?.realRoot
      : resolved.source.realRoot;
    const parentReal = await fs.realpath(path.dirname(abs));
    if (!allowedRoot || !isWithinRoot(parentReal, allowedRoot)) {
      throw reject(403, '目标父目录不在来源根目录内');
    }

    const { kind } = await movePathToTrash(abs, stat);
    return { ok: true, source: resolved.source.id, path: resolved.rel, kind };
  } catch (err) {
    req.log.warn({ err, source, path: relPath }, 'trash failed');
    return reply.code(err.statusCode || 500).send({ error: err.message });
  }
});

// GET /api/local-image?path=... — 本机图片代理
// 场景：笔记里写了三源之外的本机绝对路径（如 ~/Downloads/.../xxx.png）。
// 安全约束：
//   - 仅 GET，仅监听 127.0.0.1
//   - 扩展名必须是图片
//   - realpath 后必须落在白名单目录前缀内（默认：用户主目录 + 三源 realRoot）
//   - KB_IMAGE_WHITELIST 可用冒号分隔额外追加允许目录
function getImageWhitelist() {
  const roots = new Set();
  roots.add(path.resolve(os.homedir()));
  for (const s of SOURCES) {
    if (s.root) roots.add(path.resolve(s.root));
    if (s.realRoot) roots.add(path.resolve(s.realRoot));
  }
  const extra = (process.env.KB_IMAGE_WHITELIST || '')
    .split(':').map((x) => x.trim()).filter(Boolean);
  for (const p of extra) roots.add(path.resolve(p));
  return [...roots];
}

app.get('/api/local-image', async (req, reply) => {
  const { path: raw } = req.query;
  if (!raw) return reply.code(400).send({ error: 'path required' });
  try {
    let p = String(raw);
    if (p === '~') p = os.homedir();
    else if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2));
    if (!path.isAbsolute(p)) {
      return reply.code(400).send({ error: 'absolute path required' });
    }
    const ext = path.extname(p).slice(1).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      return reply.code(400).send({ error: 'not an image' });
    }
    const real = await fs.realpath(p);
    const whitelist = getImageWhitelist();
    const ok = whitelist.some((root) => real === root || real.startsWith(root + path.sep));
    if (!ok) return reply.code(403).send({ error: 'path not whitelisted' });
    const stat = await fs.stat(real);
    if (!stat.isFile()) return reply.code(400).send({ error: 'not a file' });
    reply.header('Content-Type', guessMime(ext));
    reply.header('Content-Length', stat.size);
    reply.header('Cache-Control', 'public, max-age=3600');
    return reply.send(createReadStream(real));
  } catch (err) {
    req.log.warn({ err }, 'local-image failed');
    return reply.code(err.statusCode || 500).send({ error: err.message });
  }
});

// GET /api/events — SSE 推送文件变更
app.get('/api/events', async (req, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
  reply.raw.setHeader('Connection', 'keep-alive');
  reply.raw.setHeader('X-Accel-Buffering', 'no');
  reply.raw.flushHeaders?.();
  reply.raw.write(`: hello\n\n`);

  const send = (evt) => {
    try {
      reply.raw.write(`data: ${JSON.stringify(evt)}\n\n`);
    } catch { /* client gone */ }
  };
  const unsub = subscribe(send);
  const keepAlive = setInterval(() => {
    try { reply.raw.write(': ping\n\n'); } catch {}
  }, 25000);

  req.raw.on('close', () => {
    clearInterval(keepAlive);
    unsub();
    try { reply.raw.end(); } catch {}
  });

  // 不 return Promise，让连接保持
  return reply;
});

const retiredSource = (_req, reply) => reply.code(410).send({ error: '此功能已停用，请使用资料检索台。' });
app.get('/api/learn/progress', retiredSource);

// GET /api/home/overview — 首页聚合
app.get('/api/home/overview', async (req, reply) => {
  try {
    return await buildHomeOverview();
  } catch (err) {
    req.log.warn({ err }, 'home overview failed');
    return reply.code(500).send({ error: err.message });
  }
});

// GET /api/recent?source=work&limit=50 — 某源下最近修改的可读文件
app.get('/api/recent', async (req, reply) => {
  const { source, limit, project, mount } = req.query;
  if (!source || !SOURCES_BY_ID[source]) {
    return reply.code(400).send({ error: 'invalid source' });
  }
  const n = Math.min(200, Math.max(1, Number(limit) || 50));
  try {
    const items = await listRecent(source, n, { project, mount });
    return { source, items };
  } catch (err) {
    req.log.warn({ err }, 'recent failed');
    return reply.code(500).send({ error: err.message });
  }
});

// GET /api/search?q=...&source=learn,obsidian&limit=60
app.get('/api/search', async (req) => {
  const { q, source, limit, offset, project, mount } = req.query;
  if (!q || String(q).trim() === '') {
    return { results: [], total: 0, grouped: { learn: [], obsidian: [], work: [], custom: [] }, ...searchStats(), took: 0 };
  }
  const sources = source ? String(source).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const t0 = Date.now();
  await ensureSearchIndex(req.log);
  const r = searchIndex(String(q), { sources, limit: limit ? Number(limit) : 60, offset, project, mount });
  return { ...r, ...searchStats(), took: Date.now() - t0, query: String(q) };
});

app.get('/api/search/stats', async () => searchStats());

for (const endpoint of ['backlinks', 'tags', 'stats', 'neighbors']) {
  app.get(`/api/obsidian/${endpoint}`, retiredSource);
}

// POST /api/open-with — 调起外部应用 / 在 Finder 中显示 / 等
// macOS 专用，参数化 spawn 不走 shell；app 白名单 + 路径白名单 + ../ 防穿透
const APP_WHITELIST = {
  typora: 'Typora',
};

app.post('/api/open-with', async (req, reply) => {
  if (process.platform !== 'darwin') {
    return reply.code(501).send({ error: 'open-with 当前仅支持 macOS' });
  }
  const body = req.body || {};
  const { action, app: appKey, source, path: relPath, absPath: rawAbs } = body;

  if (action !== 'open' && action !== 'reveal') {
    return reply.code(400).send({ error: 'action 必须为 "open" 或 "reveal"' });
  }
  if (action === 'open' && !APP_WHITELIST[appKey]) {
    return reply.code(400).send({ error: `app 不在白名单: ${appKey}（当前仅支持 ${Object.keys(APP_WHITELIST).join(', ')}）` });
  }

  // 解析最终 absPath（safeResolve 路径 或 白名单 absPath）
  let abs;
  try {
    if (source) {
      const r = safeResolve(source, relPath || '');
      abs = await fs.realpath(r.abs);
    } else if (rawAbs) {
      let p = String(rawAbs);
      if (p === '~') p = os.homedir();
      else if (p.startsWith('~/')) p = path.join(os.homedir(), p.slice(2));
      if (!path.isAbsolute(p)) {
        return reply.code(400).send({ error: '需要绝对路径' });
      }
      abs = await fs.realpath(p);
      const whitelist = getImageWhitelist(); // 复用：homedir + 三源 root/realRoot
      const ok = whitelist.some((root) => abs === root || abs.startsWith(root + path.sep));
      if (!ok) return reply.code(403).send({ error: 'path 不在白名单内' });
    } else {
      return reply.code(400).send({ error: '必须提供 source+path 或 absPath' });
    }
    const stat = await fs.stat(abs);
    if (action === 'open' && !stat.isFile()) {
      return reply.code(400).send({ error: 'open 只支持文件，不支持目录' });
    }
  } catch (err) {
    if (err.code === 'ENOENT') return reply.code(404).send({ error: '文件不存在' });
    return reply.code(err.statusCode || 400).send({ error: err.message });
  }

  const args = action === 'reveal'
    ? ['-R', abs]
    : ['-a', APP_WHITELIST[appKey], abs];

  try {
    await execFileAsync('open', args, { timeout: 8000, maxBuffer: 32_768 });
    req.log.info({ action, app: appKey, absPath: abs }, 'open-with dispatched');
    return { ok: true, action, app: appKey || null, absPath: abs };
  } catch (err) {
    req.log.error({ err, args }, 'open-with failed');
    return reply.code(500).send({ error: action === 'open' ? '无法打开 Typora，请确认已安装，或复制路径后使用其他编辑器打开。' : '无法在 Finder 中显示文件，请确认文件仍然存在。' });
  }
});

app.get('/api/health', async () => ({
  ok: true,
  sources: SOURCES.map((s) => s.id),
  search: searchStats(),
  retiredSources: RETIRED_SOURCES,
}));

// 启动后开监听；搜索索引只在用户搜索时懒加载，避免后台常驻读文件。
app.ready().then(() => {
  subscribe((event) => {
    if (event.type === 'reindex') return;
    const ext = path.extname(event.path || '').slice(1).toLowerCase();
    if (event.kind === 'dir' || isReadableTextExt(ext)) markSearchDirty();
  });
  startWatchers(app.log);
  // 变更先标记索引过期，防抖合并通知；用户搜索时才重新读取文档。
  setRebuildHandler(async ({ full = false, events = [] } = {}) => {
    app.log.info({ full, eventCount: events.length }, 'marking indexes dirty after fs changes');
    if (full) markSearchDirty();
    // 通知前端资料有更新，按需刷新搜索与目录。
    broadcastReindex();
  });
});

app.listen({ port: PORT, host: HOST })
  .then((addr) => app.log.info(`kb-dashboard api ready at ${addr}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
