import { marked } from 'marked';
import matter from 'gray-matter';
import path from 'node:path';
import { IMAGE_EXTS } from './mime.js';

const embedRegex = /!\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;
const wikilinkRegex = /\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g;

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: true,
  mangle: false,
});

/**
 * @param {string} raw 原始 md
 * @param {{ source?: string, filePath?: string }} ctx 用于解析相对嵌入路径
 */
export function renderMarkdown(raw, ctx = {}) {
  const parsed = matter(raw);
  const pre = preProcessObsidian(parsed.content, ctx);
  const html = marked.parse(pre);
  return {
    meta: parsed.data,
    html,
    raw: parsed.content,
  };
}
