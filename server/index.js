import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

import { SOURCES, SOURCES_BY_ID, safeResolve } from './lib/sources.js';
import { listDir } from './lib/tree.js';
import { renderMarkdown } from './lib/markdown.js';
import { parseProgress } from './lib/learn.js';
import { buildHomeOverview, listRecent } from './lib/stats.js';
import { buildSearchIndex, searchIndex, searchStats, getCustomMountReadableDirs } from './lib/search.js';
import { buildObsidianIndex, getBacklinks, getNeighbors, getAllTags, obsidianStats } from './lib/obsidian-index.js';
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

const PORT = Number(process.env.PORT || 5174);
const HOST = '127.0.0.1';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// GET /api/sources — 内置三源 + custom 源元信息
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
    addMountWatch?.(mount, app.log);
    // 异步重建搜索索引（让用户立即看到挂载，搜索几秒后跟进）
    buildSearchIndex(app.log).catch((err) => app.log.warn({ err }, 'rebuild after add failed'));
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
  removeMountWatch?.(id, app.log);
  buildSearchIndex(app.log).catch((err) => app.log.warn({ err }, 'rebuild after remove failed'));
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
    // 三源（learn/obsidian/work）保持原样。
    if (source === 'custom') {
      const segs = String(p || '').split('/').filter(Boolean);
      const mountId = segs[0];
      const dirInMount = segs.slice(1).join('/'); // 相对挂载点的当前目录
      if (mountId && searchStats().ready) {
        const readableDirs = getCustomMountReadableDirs(mountId);
        entries = entries.filter((e) => {
          if (isReadableTextExt(e.ext)) return true;
          if (e.type !== 'dir') return false;
          const dirRel = dirInMount ? `${dirInMount}/${e.name}` : e.name;
          return readableDirs.has(dirRel);
        });
      } else {
        // 索引未就绪：保守只过滤掉非可读文件，目录都保留
        entries = entries.filter((e) => e.type === 'dir' || isReadableTextExt(e.ext));
      }
    }
    return { source, path: rel, entries };
  } catch (err) {
    req.log.warn({ err }, 'tree failed');
    return reply.code(err.statusCode || 500).send({ error: err.message });
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
    return reply.code(err.statusCode || 500).send({ error: err.message });
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

// GET /api/learn/progress — 解析 learn 源根下的 progress.md
app.get('/api/learn/progress', async (req, reply) => {
  try {
    const data = await parseProgress(SOURCES_BY_ID.learn.root);
    return data;
  } catch (err) {
    req.log.warn({ err }, 'learn progress failed');
    return reply.code(err.statusCode || 500).send({ error: err.message });
  }
});

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
  const { source, limit } = req.query;
  if (!source || !SOURCES_BY_ID[source]) {
    return reply.code(400).send({ error: 'invalid source' });
  }
  const n = Math.min(200, Math.max(1, Number(limit) || 50));
  try {
    const items = await listRecent(source, n);
    return { source, items };
  } catch (err) {
    req.log.warn({ err }, 'recent failed');
    return reply.code(500).send({ error: err.message });
  }
});

// GET /api/search?q=...&source=learn,obsidian&limit=60
app.get('/api/search', async (req) => {
  const { q, source, limit } = req.query;
  if (!q || String(q).trim() === '') {
    return { results: [], total: 0, grouped: { learn: [], obsidian: [], work: [], custom: [] }, ...searchStats(), took: 0 };
  }
  const sources = source ? String(source).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const t0 = Date.now();
  const r = searchIndex(String(q), { sources, limit: limit ? Number(limit) : 60 });
  return { ...r, took: Date.now() - t0, query: String(q) };
});

app.get('/api/search/stats', async () => searchStats());

// Obsidian 专项
app.get('/api/obsidian/backlinks', async (req, reply) => {
  const { path: p } = req.query;
  if (!p) return reply.code(400).send({ error: 'path required' });
  return { path: String(p), backlinks: getBacklinks(String(p)), stats: obsidianStats() };
});
app.get('/api/obsidian/tags', async () => ({ tags: getAllTags(), stats: obsidianStats() }));
app.get('/api/obsidian/stats', async () => obsidianStats());

app.get('/api/obsidian/neighbors', async (req, reply) => {
  const { path: p } = req.query;
  if (!p) return reply.code(400).send({ error: 'path required' });
  return getNeighbors(String(p));
});

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
    const child = spawn('open', args, { detached: true, stdio: 'ignore' });
    child.unref();
    req.log.info({ action, app: appKey, absPath: abs }, 'open-with dispatched');
    return { ok: true, action, app: appKey || null, absPath: abs };
  } catch (err) {
    req.log.error({ err, args }, 'open-with spawn failed');
    return reply.code(500).send({ error: err.message });
  }
});

app.get('/api/health', async () => ({
  ok: true,
  sources: SOURCES.map((s) => s.id),
  search: searchStats(),
  obsidian: obsidianStats(),
}));

// 启动后后台构建索引 + 开监听
app.ready().then(() => {
  buildSearchIndex(app.log).catch((err) => app.log.error({ err }, 'search index build failed'));
  buildObsidianIndex(app.log).catch((err) => app.log.error({ err }, 'obsidian index build failed'));
  startWatchers(app.log);
  // 文件变更防抖 5 秒后批量重建索引
  setRebuildHandler(async () => {
    app.log.info('rebuilding indexes after fs changes');
    await Promise.allSettled([
      buildSearchIndex(app.log),
      buildObsidianIndex(app.log),
    ]);
    // 索引（含 custom 的 readableDirsCache）重建完成 → 通知前端重拉依赖索引的 UI（如 Custom 页文件树）
    broadcastReindex();
  });
});

app.listen({ port: PORT, host: HOST })
  .then((addr) => app.log.info(`kb-dashboard api ready at ${addr}`))
  .catch((err) => { app.log.error(err); process.exit(1); });
