import MiniSearch from 'minisearch';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { SOURCES, safeResolve } from './sources.js';
import { listMounts } from './custom-sources.js';
import { isReadableTextExt, READABLE_GLOB_PATTERNS } from './file-types.js';
import { documentContent, previewSnippet } from './search-content.js';

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
  '**/ai全局管理/**',
];

const MAX_INDEX_FILE_BYTES = Number(process.env.KB_SEARCH_MAX_FILE_BYTES || 1_500_000);
const MAX_CUSTOM_INDEX_FILES_PER_MOUNT = Number(process.env.KB_SEARCH_MAX_CUSTOM_FILES_PER_MOUNT || 1200);

// 中英混合分词：英文/数字按 word，中文逐字分
export function tokenize(text) {
  if (!text) return [];
  return text.toLowerCase().match(/[a-z0-9_-]+|[一-龥]/gu) || [];
}


let index = null;
let docs = new Map(); // id -> { source, path, title, content, size, mtime }
let lastBuilt = null;
let building = false;
let buildPromise = null;
let dirty = true;
let revision = 0;
let skippedCustomMounts = new Set();

function createSearchIndex() {
  return new MiniSearch({
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
}

function toPosix(p) {
  return String(p || '').split(path.sep).join('/');
}

function normalizeDocPath(p) {
  return toPosix(String(p || '').replace(/^[/\\]+/, ''));
}

function getDocId(sourceId, docPath) {
  return `${sourceId}::${normalizeDocPath(docPath)}`;
}

function isReadablePath(p) {
  const ext = path.extname(String(p || '')).slice(1).toLowerCase();
  return isReadableTextExt(ext);
}

async function readDoc(sourceId, docPath, abs, knownStat = null) {
  const normalizedPath = normalizeDocPath(docPath);
  if (!isReadablePath(normalizedPath)) return null;

  const stat = knownStat || await fs.stat(abs);
  if (!stat.isFile()) return null;
  if (stat.size > MAX_INDEX_FILE_BYTES) return null;

  const raw = await fs.readFile(abs, 'utf8');
  const fallbackTitle = path.basename(normalizedPath, path.extname(normalizedPath));
  const { title, content } = documentContent(raw, path.extname(normalizedPath).slice(1).toLowerCase(), fallbackTitle);
  return {
    id: getDocId(sourceId, normalizedPath),
    source: sourceId,
    path: normalizedPath,
    title,
    content,
    size: stat.size,
    mtime: stat.mtime.toISOString(),
  };
}

function discardDoc(id) {
  if (!index || !docs.has(id)) return false;
  try {
    index.discard(id);
  } catch {
    // MiniSearch 可能已因自动 vacuum 清掉，Map 仍以本地状态为准收敛。
  }
  docs.delete(id);
  return true;
}

function discardByPrefix(sourceId, prefix) {
  const normalizedPrefix = normalizeDocPath(prefix);
  if (!normalizedPrefix) return 0;
  let count = 0;
  for (const [id, doc] of [...docs.entries()]) {
    if (doc.source !== sourceId) continue;
    if (doc.path === normalizedPrefix || doc.path.startsWith(`${normalizedPrefix}/`)) {
      if (discardDoc(id)) count += 1;
    }
  }
  return count;
}

export async function buildSearchIndex(log) {
  if (buildPromise) return buildPromise;
  building = true;
  const buildRevision = revision;
  const t0 = Date.now();
  buildPromise = (async () => {
    const ms = createSearchIndex();
    const nextDocs = new Map();
    const nextSkippedCustomMounts = new Set();

    // 项目文档与自定义挂载点分别扫描。
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
        files = await fg(READABLE_GLOB_PATTERNS, {
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
      const indexableFiles = files.filter((f) => Number(f.stats?.size || 0) <= MAX_INDEX_FILE_BYTES);
      const skippedLarge = files.length - indexableFiles.length;
      if (skippedLarge > 0) {
        log?.warn(
          { source: t.sourceId, mountId: t.prefix || null, skippedLarge, maxBytes: MAX_INDEX_FILE_BYTES },
          'large files skipped from search index',
        );
      }
      if (t.sourceId === 'custom' && indexableFiles.length > MAX_CUSTOM_INDEX_FILES_PER_MOUNT) {
        nextSkippedCustomMounts.add(t.prefix);
        log?.warn(
          { mountId: t.prefix, files: indexableFiles.length, limit: MAX_CUSTOM_INDEX_FILES_PER_MOUNT },
          'custom mount skipped from search index because it is too large',
        );
        continue;
      }
      for (const f of indexableFiles) {
        const abs = path.join(t.cwd, f.path);
        try {
          const docPath = t.prefix ? path.posix.join(t.prefix, toPosix(f.path)) : toPosix(f.path);
          const doc = await readDoc(t.sourceId, docPath, abs, f.stats);
          if (!doc) continue;
          ms.add(doc);
          nextDocs.set(doc.id, doc);
        } catch {
          continue;
        }
      }
    }

    index = ms;
    docs = nextDocs;
    skippedCustomMounts = nextSkippedCustomMounts;
    // 索引重建 → custom 源"目录是否含可读文件"缓存失效
    readableDirsCache = null;
    lastBuilt = new Date();
    dirty = revision !== buildRevision;
    log?.info(`search index ready: ${docs.size} docs in ${Date.now() - t0} ms`);
    return true;
  })();
  try {
    return await buildPromise;
  } finally {
    building = false;
    buildPromise = null;
  }
}

export function markSearchDirty() {
  revision += 1;
  dirty = true;
  readableDirsCache = null;
}

export async function ensureSearchIndex(log) {
  if (!index || dirty) {
    await buildSearchIndex(log);
  }
  return !!index && !dirty;
}

export async function applySearchEvents(events = [], log) {
  if (!index || building || dirty) return false;

  const t0 = Date.now();
  let changed = 0;
  for (const evt of events) {
    if (!evt?.source || !evt.path) continue;

    const sourceId = evt.source;
    const docPath = normalizeDocPath(evt.path);
    if (!docPath) continue;

    if (evt.kind === 'dir') {
      if (evt.type === 'unlink') changed += discardByPrefix(sourceId, docPath);
      continue;
    }

    const id = getDocId(sourceId, docPath);
    if (!isReadablePath(docPath)) {
      if (evt.type === 'unlink') changed += discardDoc(id) ? 1 : 0;
      continue;
    }

    if (evt.type === 'unlink') {
      changed += discardDoc(id) ? 1 : 0;
      continue;
    }

    if (evt.type !== 'add' && evt.type !== 'change') continue;

    try {
      const { abs } = safeResolve(sourceId, docPath);
      const doc = await readDoc(sourceId, docPath, abs);
      if (!doc) {
        changed += discardDoc(id) ? 1 : 0;
        continue;
      }
      if (docs.has(id)) discardDoc(id);
      index.add(doc);
      docs.set(id, doc);
      changed += 1;
    } catch {
      changed += discardDoc(id) ? 1 : 0;
    }
  }

  if (changed > 0) {
    readableDirsCache = null;
    lastBuilt = new Date();
    log?.info(`search index updated incrementally: ${changed} changes in ${Date.now() - t0} ms`);
  }
  return true;
}

export const isSearchReady = () => !!index;
export const searchStats = () => ({
  ready: !!index,
  dirty,
  docCount: docs.size,
  lastBuilt: lastBuilt?.toISOString() || null,
  skippedCustomMounts: [...skippedCustomMounts],
});

// custom 源："递归下去含可读文件的目录"集合（按 mountId 分组），由索引复用构建。
// key: mountId，value: Set<相对挂载点的目录路径>。
let readableDirsCache = null;
function ensureReadableDirsCache() {
  if (readableDirsCache) return readableDirsCache;
  const map = new Map();
  for (const doc of docs.values()) {
    if (doc.source !== 'custom') continue;
    const slash = doc.path.indexOf('/');
    if (slash === -1) continue; // custom 源 path 形如 <mountId>/<rel>
    const mountId = doc.path.slice(0, slash);
    const rel = doc.path.slice(slash + 1); // 相对挂载点
    if (!map.has(mountId)) map.set(mountId, new Set());
    const set = map.get(mountId);
    // 把这条可读文件的所有祖先目录加入 set
    let i = rel.lastIndexOf('/');
    while (i > 0) {
      set.add(rel.slice(0, i));
      i = rel.lastIndexOf('/', i - 1);
    }
  }
  readableDirsCache = map;
  return map;
}
export function getCustomMountReadableDirs(mountId) {
  if (skippedCustomMounts.has(mountId)) return null;
  return ensureReadableDirsCache().get(mountId) || new Set();
}

export function searchIndex(query, opts = {}) {
  if (!index) return { results: [], total: 0, grouped: { learn: [], obsidian: [], work: [], custom: [] }, ready: false, dirty };
  const raw = index.search(query);
  const sources = opts.sources?.length ? opts.sources : null;
  const filtered = raw.filter((hit) => {
    if (sources && !sources.includes(hit.source)) return false;
    if (opts.project && (hit.source !== 'work' || hit.path.split('/')[0] !== opts.project)) return false;
    if (opts.mount && (hit.source !== 'custom' || hit.path.split('/')[0] !== opts.mount)) return false;
    return true;
  });
  const offset = Math.max(0, Math.floor(Number.isFinite(Number(opts.offset)) ? Number(opts.offset) : 0));
  const limit = Math.min(200, Math.max(1, Math.floor(Number(opts.limit) || 60)));
  const limited = filtered.slice(offset, offset + limit);
  const hits = limited.map((r) => {
    const d = docs.get(r.id);
    return {
      source: r.source,
      path: r.path,
      title: r.title,
      mtime: r.mtime,
      size: r.size,
      score: Number(r.score.toFixed(3)),
      ...previewSnippet(d?.content || '', query),
    };
  });
  const grouped = { learn: [], obsidian: [], work: [], custom: [] };
  for (const h of hits) (grouped[h.source] ||= []).push(h);
  return {
    results: hits,
    total: filtered.length,
    offset,
    nextOffset: offset + hits.length,
    hasMore: offset + hits.length < filtered.length,
    grouped,
    ready: true,
    dirty,
    lastBuilt: lastBuilt?.toISOString() || null,
  };
}
