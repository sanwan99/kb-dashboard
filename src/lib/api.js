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

async function jsonRequest(method, url, body) {
  // Content-Type: application/json 只在真的带 body 时才设。否则 Fastify 会按 JSON
  // 去 parse 空 body → "Unexpected end of JSON input" → 400 Bad Request（DELETE 场景踩过）。
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const r = await fetch(apiUrl(url), init);
  if (!r.ok) {
    let msg = '';
    try {
      const j = await r.json();
      msg = j.error || JSON.stringify(j);
    } catch {
      msg = await r.text().catch(() => '');
    }
    throw new Error(`${r.status} ${r.statusText}: ${msg}`);
  }
  if (r.status === 204) return null;
  return r.json();
}

const postJson = (url, body) => jsonRequest('POST', url, body);
const patchJson = (url, body) => jsonRequest('PATCH', url, body);
const deleteJson = (url) => jsonRequest('DELETE', url);

export function openWithExternal(body) {
  return postJson('/api/open-with', body);
}

export function trashFile(source, path) {
  return postJson('/api/file/trash', { source, path });
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

export function getRecent(source, limit = 50) {
  return request(`/api/recent?source=${encodeURIComponent(source)}&limit=${limit}`);
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

// ── 自定义来源（custom 源） ────────────────────────────────────
// 后端 GET/POST/PATCH/DELETE /api/custom-sources

export function listCustomSources() {
  return request('/api/custom-sources').then((d) => d.items || []);
}

export function addCustomSource({ path: p, name } = {}) {
  // 添加后让 cache 失效，下次 getCachedSources() 重新拉
  sourcesCache = null;
  return postJson('/api/custom-sources', { path: p, name });
}

export function renameCustomSource(id, name) {
  sourcesCache = null;
  return patchJson(`/api/custom-sources/${encodeURIComponent(id)}`, { name });
}

export function reorderCustomSources(idArray) {
  sourcesCache = null;
  return patchJson('/api/custom-sources/_order', { order: idArray });
}

export function removeCustomSource(id) {
  sourcesCache = null;
  return deleteJson(`/api/custom-sources/${encodeURIComponent(id)}`);
}

/**
 * 选目录。Electron 模式优先走原生 dialog（preload 暴露的 __KB_PICK_DIR__）；
 * 浏览器模式退化为 prompt 让用户输绝对路径。
 * @returns {Promise<{canceled:boolean, path?:string}>}
 */
export async function pickDirectory(opts = {}) {
  if (typeof window !== 'undefined' && typeof window.__KB_PICK_DIR__ === 'function') {
    try {
      const r = await window.__KB_PICK_DIR__(opts);
      return r || { canceled: true };
    } catch (e) {
      return { canceled: true, error: e?.message || String(e) };
    }
  }
  // 浏览器降级：prompt
  const guess = opts.defaultPath || '';
  const input = typeof window !== 'undefined'
    ? window.prompt('输入要引入的目录绝对路径（支持 ~/ 起头）', guess)
    : null;
  if (input == null) return { canceled: true };
  const trimmed = String(input).trim();
  if (!trimmed) return { canceled: true };
  return { canceled: false, path: trimmed };
}
