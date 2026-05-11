export const MARKDOWN_EXTS = new Set(['md', 'markdown']);
export const READABLE_EXTS = new Set(['md', 'markdown', 'sql']);

export function isMarkdownExt(ext) {
  return MARKDOWN_EXTS.has(String(ext || '').toLowerCase());
}

export function isReadableExt(ext) {
  return READABLE_EXTS.has(String(ext || '').toLowerCase());
}

export function isReadablePath(p = '') {
  const pathPart = String(p).split('#')[0];
  return /\.(?:md|markdown|sql)$/i.test(pathPart);
}
