import MiniSearch from 'minisearch';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { SOURCES } from './sources.js';
import { listMounts } from './custom-sources.js';

const GLOB_PATTERNS = ['**/*.md', '**/*.markdown'];
const GLOB_IGNORE = [
  '**/.git/**',
  '**/.obsidian/**',
  '**/node_modules/**',
  '**/target/**',
  '**/dist/**',
  '**/.vite/**',
  '**/.codex_tmp/**',
  '**/.claude/**',
  '**/.trash/**',
  '**/*_副本/**',
];

// 中英混合分词：英文/数字按 word，中文逐字分
export function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z0-9_-]+|[一-龥]/gu) || [];
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let index = null;
let docs = new Map(); // id -> { source, path, title, content, size, mtime }
let lastBuilt = null;
let building = false;

export async function buildSearchIndex(log) {
  if (building) return;
  building = true;
  const t0 = Date.now();
  const ms = new MiniSearch({
    fields: ['title', 'content'],
    storeFields: ['source', 'path', 'title', 'mtime', 'size'],
    tokenize,
    processTerm: (term) => term.toLowerCase(),
    searchOptions: {
      tokenize,
      processTerm: (term) => term.toLowerCase(),
      prefix: (term) => /^[a-z0-9]/.test(term) && term.length >= 2,
      fuzzy: (term) => (/^[a-z]/.test(term) && term.length >= 4 ? 0.2 : false),
      combineWith: 'AND',
    },
  });
  const nextDocs = new Map();

  // 扫描目标 = 内置三源 + custom 各挂载点（每个挂载点独立 fast-glob）
  const targets = [];
  for (const src of SOURCES) {
    if (src.multi) continue;
    targets.push({ sourceId: src.id, cwd: src.root, prefix: '' });
  }
  for (const m of listMounts()) {
    if (!m.available) continue;
    targets.push({ sourceId: 'custom', cwd: m.realRoot, prefix: m.id });
  }

  for (const t of targets) {
    let files;
    try {
      files = await fg(GLOB_PATTERNS, {
        cwd: t.cwd,
        ignore: GLOB_IGNORE,
        stats: true,
        followSymbolicLinks: true,
        onlyFiles: true,
        suppressErrors: true,
      });
    } catch (err) {
      log?.warn({ err, source: t.sourceId, cwd: t.cwd }, 'scan failed');
      continue;
    }
    for (const f of files) {
      const abs = path.join(t.cwd, f.path);
      let content = '';
      try {
        content = await fs.readFile(abs, 'utf8');
      } catch {
        continue;
      }
      const title = path.basename(f.path, path.extname(f.path));
      // custom 源：path 字段加 mountId 前缀，让前端 /api/file?source=custom&path=<mountId>/... 直接可用
      const docPath = t.prefix ? path.posix.join(t.prefix, f.path.split(path.sep).join('/')) : f.path;
      const id = `${t.sourceId}::${docPath}`;
      const doc = {
        id,
        source: t.sourceId,
        path: docPath,
        title,
        content,
        size: f.stats.size,
        mtime: new Date(f.stats.mtimeMs).toISOString(),
      };
      ms.add(doc);
      nextDocs.set(id, doc);
    }
  }
  index = ms;
  docs = nextDocs;
  lastBuilt = new Date();
  building = false;
  log?.info(`search index ready: ${docs.size} docs in ${Date.now() - t0} ms`);
}

export const isSearchReady = () => !!index;
export const searchStats = () => ({
  ready: !!index,
  docCount: docs.size,
  lastBuilt: lastBuilt?.toISOString() || null,
});

function buildSnippet(content, query, len = 160) {
  if (!content) return '';
  const terms = tokenize(query).filter(Boolean);
  const lc = content.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const p = lc.indexOf(t);
    if (p !== -1 && (pos === -1 || p < pos)) pos = p;
  }
  if (pos === -1) {
    const s = content.slice(0, len);
    return s + (content.length > len ? '…' : '');
  }
  const start = Math.max(0, pos - 40);
  const end = Math.min(content.length, start + len);
  let snippet = content.slice(start, end).replace(/\n+/g, ' ');
  for (const t of terms) {
    if (!t) continue;
    snippet = snippet.replace(new RegExp(escapeRe(t), 'gi'), (m) => `<mark>${m}</mark>`);
  }
  return (start > 0 ? '…' : '') + snippet + (end < content.length ? '…' : '');
}

export function searchIndex(query, opts = {}) {
  if (!index) return { results: [], total: 0, grouped: { learn: [], obsidian: [], work: [], custom: [] }, ready: false };
  const raw = index.search(query);
  const sources = opts.sources?.length ? opts.sources : null;
  const filtered = sources ? raw.filter((r) => sources.includes(r.source)) : raw;
  const limited = filtered.slice(0, opts.limit || 60);
  const hits = limited.map((r) => {
    const d = docs.get(r.id);
    return {
      source: r.source,
      path: r.path,
      title: r.title,
      mtime: r.mtime,
      size: r.size,
      score: Number(r.score.toFixed(3)),
      snippet: buildSnippet(d?.content || '', query),
    };
  });
  const grouped = { learn: [], obsidian: [], work: [], custom: [] };
  for (const h of hits) (grouped[h.source] ||= []).push(h);
  return {
    results: hits,
    total: filtered.length,
    grouped,
    ready: true,
    lastBuilt: lastBuilt?.toISOString() || null,
  };
}
