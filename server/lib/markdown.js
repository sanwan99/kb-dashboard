import { Marked } from 'marked';
import matter from 'gray-matter';
import path from 'node:path';
import os from 'node:os';
import { IMAGE_EXTS } from './mime.js';
import { SOURCES } from './sources.js';

const embedRegex = /!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
const wikilinkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 给 embed 的 target 解析出 source 内的相对路径
// 规则：
//   - 含 `/`：视为相对 source root 的完整路径
//   - 否则：相对当前 md 的同目录（Obsidian 默认行为之一）
function resolveEmbedPath(target, ctx) {
  const t = target.trim();
  if (t.includes('/')) return t;
  if (ctx?.filePath) {
    const dir = path.dirname(ctx.filePath);
    return dir === '.' ? t : path.posix.join(dir, t);
  }
  return t;
}

function preProcessObsidian(src, ctx) {
  // 先处理 embed
  let out = src.replace(embedRegex, (_, rawTarget, alias) => {
    const target = rawTarget.trim();
    const ext = path.extname(target).slice(1).toLowerCase();
    // 图片走 /api/blob
    if (IMAGE_EXTS.has(ext) && ctx?.source) {
      const rel = resolveEmbedPath(target, ctx);
      const src = `/api/blob?source=${encodeURIComponent(ctx.source)}&path=${encodeURIComponent(rel)}`;
      const altText = alias || target;
      return `<img class="md-embed-img" src="${src}" alt="${escapeHtml(altText)}" loading="lazy" />`;
    }
    // 非图片：保留占位块（未来可做 md embed）
    const label = alias || target;
    return `<div class="embed"><div class="embed-head">![[${escapeHtml(target)}]]</div><div class="embed-body">${escapeHtml(label)}</div></div>`;
  });
  out = out.replace(wikilinkRegex, (_, target, alias) => {
    const text = alias || target;
    return `<span class="wikilink">${escapeHtml(text)}</span>`;
  });
  return out;
}

// 本机绝对路径 → 如果落在三源内走 /api/blob，否则走 /api/local-image（白名单代理）
function mapAbsoluteToApi(absPath) {
  const normalized = path.normalize(absPath);
  for (const src of SOURCES) {
    for (const root of [src.realRoot, src.root]) {
      if (!root) continue;
      const rootNorm = path.normalize(root);
      if (normalized === rootNorm) {
        return `/api/blob?source=${encodeURIComponent(src.id)}&path=`;
      }
      if (normalized.startsWith(rootNorm + path.sep)) {
        const rel = normalized.slice(rootNorm.length + 1);
        return `/api/blob?source=${encodeURIComponent(src.id)}&path=${encodeURIComponent(rel)}`;
      }
    }
  }
  return `/api/local-image?path=${encodeURIComponent(normalized)}`;
}

// 标准 Markdown `![alt](href)` 的 href 改写
//   - http(s)/data/blob/protocol-relative → 原样
//   - file:// / ~/ / 绝对路径 → 映射为 /api/blob 或 /api/local-image
//   - 相对路径 → 基于当前 md 同目录，拼 source-relative 后走 /api/blob
function resolveImageSrc(href, ctx) {
  if (!href) return href;
  let h = String(href).trim();
  if (!h) return h;
  if (/^(https?:|data:|blob:)/i.test(h)) return h;
  if (/^\/\//.test(h)) return h;
  if (/^file:\/\//i.test(h)) {
    const stripped = h.replace(/^file:\/\//i, '');
    let decoded;
    try { decoded = decodeURI(stripped); } catch { decoded = stripped; }
    return mapAbsoluteToApi(decoded);
  }
  if (h === '~' || h.startsWith('~/')) {
    const expanded = h === '~' ? os.homedir() : path.join(os.homedir(), h.slice(2));
    return mapAbsoluteToApi(expanded);
  }
  if (h.startsWith('/')) {
    return mapAbsoluteToApi(h);
  }
  // 相对路径
  if (ctx?.source && ctx?.filePath) {
    const dir = path.posix.dirname(ctx.filePath);
    const rel = dir === '.' ? h : path.posix.join(dir, h);
    return `/api/blob?source=${encodeURIComponent(ctx.source)}&path=${encodeURIComponent(rel)}`;
  }
  return h;
}

/**
 * @param {string} raw 原始 md
 * @param {{ source?: string, filePath?: string }} ctx 用于解析相对嵌入路径
 */
export function renderMarkdown(raw, ctx = {}) {
  const parsed = matter(raw);
  const pre = preProcessObsidian(parsed.content, ctx);
  const m = new Marked({ gfm: true, breaks: false, headerIds: true, mangle: false });
  m.use({
    renderer: {
      image(token) {
        const href = resolveImageSrc(token?.href, ctx);
        const alt = escapeHtml(token?.text ?? '');
        const title = token?.title ? ` title="${escapeHtml(token.title)}"` : '';
        return `<img class="md-image" src="${href}" alt="${alt}"${title} loading="lazy" />`;
      },
    },
  });
  const html = m.parse(pre);
  return {
    meta: parsed.data,
    html,
    raw: parsed.content,
  };
}
