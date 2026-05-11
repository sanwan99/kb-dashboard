export const MARKDOWN_EXTS = new Set(['md', 'markdown']);
export const READABLE_TEXT_EXTS = new Set(['md', 'markdown', 'sql']);

export const READABLE_GLOB_PATTERNS = ['**/*.md', '**/*.markdown', '**/*.sql'];

export function isMarkdownExt(ext) {
  return MARKDOWN_EXTS.has(String(ext || '').toLowerCase());
}

export function isReadableTextExt(ext) {
  return READABLE_TEXT_EXTS.has(String(ext || '').toLowerCase());
}

export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCodeHtml(raw, ext) {
  const lang = ext === 'sql' ? 'sql' : 'plaintext';
  return `<pre><code class="language-${lang}">${escapeHtml(raw)}</code></pre>`;
}
