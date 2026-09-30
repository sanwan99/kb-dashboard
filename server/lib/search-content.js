import matter from 'gray-matter';

const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function documentContent(raw, ext, fallbackTitle) {
  let content = raw;
  let title = fallbackTitle;
  if (ext === 'md' || ext === 'markdown') {
    try {
      const parsed = matter(raw);
      content = parsed.content;
      if (typeof parsed.data.title === 'string' && parsed.data.title.trim()) title = parsed.data.title.trim();
      else {
        const heading = content.replace(/```[\s\S]*?```/g, '').match(/^#\s+(.+)$/m);
        if (heading) title = heading[1].replace(/[*_`]/g, '').trim();
      }
    } catch { /* 非标准 frontmatter 仍可按原文检索。 */ }
  }
  return { title: String(title || fallbackTitle).slice(0, 240), content };
}

export function plainPreview(content) {
  return String(content || '')
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^\s*```[^\n]*$/gm, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|>\s*)/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function previewSnippet(content, query, size = 180) {
  const plain = plainPreview(content);
  const terms = String(query || '').match(/[a-z0-9_-]+|[一-龥]+/giu) || [];
  const lower = plain.toLocaleLowerCase();
  const positions = terms.map((term) => lower.indexOf(term.toLocaleLowerCase())).filter((index) => index >= 0);
  const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 45);
  const end = Math.min(plain.length, start + size);
  const preview = `${start ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`;
  if (!terms.length) return { preview, snippet: escapeHtml(preview) };
  const keys = new Set(terms.map((term) => term.toLocaleLowerCase()));
  const expression = new RegExp(`(${[...new Set(terms)].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})`, 'gi');
  const snippet = preview.split(expression).map((part) => keys.has(part.toLocaleLowerCase()) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)).join('');
  return { preview, snippet };
}
