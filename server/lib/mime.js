const MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  avif: 'image/avif',
  pdf: 'application/pdf',
  txt: 'text/plain; charset=utf-8',
  json: 'application/json; charset=utf-8',
};

export const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif']);

export function guessMime(ext) {
  return MIME[String(ext || '').toLowerCase()] || 'application/octet-stream';
}
