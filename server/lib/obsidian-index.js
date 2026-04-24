import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { SOURCES_BY_ID } from './sources.js';

const GLOB_PATTERNS = ['**/*.md', '**/*.markdown'];
const GLOB_IGNORE = [
  '**/.git/**',
  '**/.obsidian/**',
  '**/.trash/**',
  '**/node_modules/**',
];

// [[target]] / [[target|alias]] / [[target#heading]] / [[target#heading|alias]]
const WIKILINK_RE = /\[\[([^\]|#\r\n]+?)(?:#[^\]|\r\n]+)?(?:\|[^\]\r\n]+)?\]\]/g;
// #tag：前面必须是行首或空白（排除 markdown 标题 ##xxx 和 URL 片段）；tag 首字符必须是字母/中文（避免 #10-xxx 纯数字编号误判）
const TAG_RE = /(?:^|\s)#(?![#\s])([\p{L}][\p{L}\p{N}_\-/]*)/gu;
const FENCE_RE = /^```/;

let byName = new Map();     // name (basename 不含扩展) -> [path, ...]
let byFullPath = new Map(); // "path/to/name" -> path  (Obsidian 也支持路径形式)
let backlinks = new Map();  // toPath -> [{from, line, preview}]
let outgoing = new Map();   // fromPath -> [{to, line, preview}]
let tagIndex = new Map();   // tag -> Set<path>
let lastBuilt = null;
let ready = false;

function resolveTarget(target) {
  const trimmed = target.trim();
  if (!trimmed) return null;
  // 先按 full path 查
  const full = byFullPath.get(trimmed);
  if (full) return full;
  // 再按 basename 查（多候选取第一个）
  const paths = byName.get(trimmed);
  if (paths && paths.length > 0) return paths[0];
  // 最后按 target 的 basename 查（比如 [[10-Projects/知识库看板]]）
  if (trimmed.includes('/')) {
    const base = trimmed.split('/').pop();
    const bp = byName.get(base);
    if (bp && bp.length > 0) return bp[0];
  }
  return null;
}

export async function buildObsidianIndex(log) {
  const t0 = Date.now();
  const src = SOURCES_BY_ID.obsidian;
  const files = await fg(GLOB_PATTERNS, {
    cwd: src.root,
    ignore: GLOB_IGNORE,
    onlyFiles: true,
    suppressErrors: true,
    followSymbolicLinks: true,
  });

  const nextByName = new Map();
  const nextByFullPath = new Map();
  const nextBacklinks = new Map();
  const nextOutgoing = new Map();
  const nextTagIndex = new Map();

  // Pass 1: 文件名索引
  for (const p of files) {
    const stem = path.basename(p, path.extname(p));
    const stemPath = p.replace(/\.(md|markdown)$/i, ''); // 相对 vault 根的无扩展 path
    if (!nextByName.has(stem)) nextByName.set(stem, []);
    nextByName.get(stem).push(p);
    nextByFullPath.set(stemPath, p);
  }

  // Pass 2: 扫 wikilink 和 tag
  for (const p of files) {
    const abs = path.join(src.root, p);
    let content;
    try {
      content = await fs.readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split('\n');
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (FENCE_RE.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      // wikilinks
      const linkMatches = line.matchAll(WIKILINK_RE);
      for (const m of linkMatches) {
        const raw = m[1];
        // 临时用这些 maps 去解析（由于 Pass 1 已经填好 nextByName/nextByFullPath）
        const trimmed = raw.trim();
        let to =
          nextByFullPath.get(trimmed) ||
          (nextByName.get(trimmed) && nextByName.get(trimmed)[0]) ||
          null;
        if (!to && trimmed.includes('/')) {
          const base = trimmed.split('/').pop();
          to = (nextByName.get(base) && nextByName.get(base)[0]) || null;
        }
        if (!to || to === p) continue;
        if (!nextBacklinks.has(to)) nextBacklinks.set(to, []);
        nextBacklinks.get(to).push({
          from: p,
          line: i + 1,
          preview: line.trim().slice(0, 240),
        });
        if (!nextOutgoing.has(p)) nextOutgoing.set(p, []);
        nextOutgoing.get(p).push({
          to,
          line: i + 1,
          preview: line.trim().slice(0, 240),
        });
      }

      // tags
      for (const m of line.matchAll(TAG_RE)) {
        const tag = m[1];
        if (!nextTagIndex.has(tag)) nextTagIndex.set(tag, new Set());
        nextTagIndex.get(tag).add(p);
      }
    }
  }

  byName = nextByName;
  byFullPath = nextByFullPath;
  backlinks = nextBacklinks;
  outgoing = nextOutgoing;
  tagIndex = nextTagIndex;
  lastBuilt = new Date();
  ready = true;
  log?.info(
    `obsidian index ready: ${files.length} files, ${byName.size} names, ${tagIndex.size} tags, ${[...backlinks.values()].reduce((a, b) => a + b.length, 0)} backlink edges, ${Date.now() - t0}ms`,
  );
}

export function getBacklinks(targetPath) {
  return backlinks.get(targetPath) || [];
}

export function getOutgoing(fromPath) {
  return outgoing.get(fromPath) || [];
}

// 局部图谱：中心 + 入链 + 出链（去重）
export function getNeighbors(p) {
  const inEdges = (backlinks.get(p) || []).map((b) => ({ path: b.from, direction: 'in' }));
  const outEdges = (outgoing.get(p) || []).map((o) => ({ path: o.to, direction: 'out' }));
  const seen = new Map();
  for (const e of [...inEdges, ...outEdges]) {
    if (seen.has(e.path)) {
      if (seen.get(e.path).direction !== e.direction) seen.get(e.path).direction = 'both';
    } else {
      seen.set(e.path, { ...e });
    }
  }
  return { center: p, neighbors: [...seen.values()] };
}

export function getAllTags() {
  const out = [...tagIndex.entries()].map(([tag, set]) => ({ tag, count: set.size }));
  out.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-CN'));
  return out;
}

export function obsidianStats() {
  return {
    ready,
    fileCount: byName.size,
    tagCount: tagIndex.size,
    backlinkTargets: backlinks.size,
    lastBuilt: lastBuilt?.toISOString() || null,
  };
}
