// 薄客户端：dev 下 /api/* 走 Vite proxy；prod (Electron loadFile) 下通过 preload 注入绝对 URL
const API_BASE =
  (typeof window !== 'undefined' && window.__KB_API_BASE__) || '';

export const apiUrl = (path) => API_BASE + path;

async function request(url) {
  const r = await fetch(apiUrl(url));
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText}: ${body}`);
  }
  return r.json();
}

export function getSources() {
  return request('/api/sources').then((d) => d.sources);
}

let sourcesCache = null;
export async function getCachedSources() {
  if (!sourcesCache) sourcesCache = await getSources();
  return sourcesCache;
}

export function getTree(sourceId, relPath = '') {
  const qs = new URLSearchParams({ source: sourceId, path: relPath });
  return request(`/api/tree?${qs}`);
}

export function getFile(sourceId, relPath) {
  const qs = new URLSearchParams({ source: sourceId, path: relPath });
  return request(`/api/file?${qs}`);
}

export function getLearnProgress() {
  return request('/api/learn/progress');
}

export function getHomeOverview() {
  return request('/api/home/overview');
}

export function search(q, { sources = [], limit = 60 } = {}) {
  const qs = new URLSearchParams({ q });
  if (sources.length) qs.set('source', sources.join(','));
  if (limit) qs.set('limit', String(limit));
  return request(`/api/search?${qs}`);
}

export function getSearchStats() {
  return request('/api/search/stats');
}

export function getObsidianBacklinks(relPath) {
  const qs = new URLSearchParams({ path: relPath });
  return request(`/api/obsidian/backlinks?${qs}`);
}

export function getObsidianTags() {
  return request('/api/obsidian/tags');
}

export function getObsidianNeighbors(relPath) {
  const qs = new URLSearchParams({ path: relPath });
  return request(`/api/obsidian/neighbors?${qs}`);
}

/**
 * 订阅后端 SSE 推送的文件变更。
 * @param {(evt: {type:'add'|'change'|'unlink', source:string, path:string, ts:number}) => void} onEvent
 * @returns {() => void} 调用返回值可断开订阅
 */
export function subscribeFileEvents(onEvent) {
  if (typeof EventSource === 'undefined') return () => {};
  const es = new EventSource(apiUrl('/api/events'));
  es.onmessage = (e) => {
    try {
      const evt = JSON.parse(e.data);
      onEvent(evt);
    } catch { /* ignore */ }
  };
  es.onerror = () => {
    // EventSource 会自动重连，这里静默
  };
  return () => es.close();
}

export function blobUrl(source, relPath) {
  const qs = new URLSearchParams({ source, path: relPath });
  return apiUrl(`/api/blob?${qs}`);
}
