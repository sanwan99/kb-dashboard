export const ACTIVE_LIBRARY_SOURCES = ['work', 'custom'];

export function parseLibraryState(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const source = ACTIVE_LIBRARY_SOURCES.includes(params.get('source')) ? params.get('source') : null;
  const view = ['search', 'browse', 'recent'].includes(params.get('view')) ? params.get('view') : 'search';
  const scope = /^(?:all|work|custom|work:[^/]+|custom:[^/]+)$/.test(params.get('scope') || '') ? params.get('scope') : 'all';
  const path = source && params.get('path') ? params.get('path').replace(/^\/+/, '') : null;
  const browseSource = ACTIVE_LIBRARY_SOURCES.includes(params.get('browse')) ? params.get('browse') : source || 'work';
  return { q: params.get('q') || '', view, scope, source, path, browseSource, folder: params.get('folder') || '', panel: params.get('panel') || null };
}

export function scopeOptions(scope, enabledSources = ACTIVE_LIBRARY_SOURCES) {
  const separator = scope.indexOf(':');
  const source = separator < 0 ? scope : scope.slice(0, separator);
  const group = separator < 0 ? null : scope.slice(separator + 1);
  return {
    sources: source === 'all' ? enabledSources : enabledSources.filter((item) => item === source),
    ...(source === 'work' && group ? { project: group } : {}),
    ...(source === 'custom' && group ? { mount: group } : {}),
  };
}

export function matchesScope(file, scope) {
  if (scope === 'all') return true;
  const [source, ...parts] = scope.split(':');
  return file.source === source && (!parts.length || file.path.split('/')[0] === parts.join(':'));
}

export function fileIdentity(file) {
  return file?.source && file?.path ? `${file.source}::${file.path}` : '';
}

export function parentPath(path = '') {
  return path.split('/').slice(0, -1).join('/');
}

export function fileTitle(file) {
  if (typeof file?.title === 'string' && file.title.trim()) return file.title.trim();
  if (typeof file?.meta?.title === 'string' && file.meta.title.trim()) return file.meta.title.trim();
  if (['md', 'markdown'].includes(file?.ext)) {
    const heading = file.raw?.replace(/```[\s\S]*?```/g, '').match(/^#\s+(.+)$/m);
    if (heading) return heading[1].replace(/[*_`]/g, '').trim();
  }
  return (file?.path || '').split('/').pop()?.replace(/\.(md|markdown)$/i, '') || '未命名文档';
}

export function sourceLabel(file, mounts = []) {
  const first = file?.path?.split('/')[0];
  return file?.source === 'work' ? (file.path.includes('/') ? first : '项目文档') : mounts.find((mount) => mount.id === first)?.name || '本地目录';
}

export function relativeTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  if (hours < 24 * 7) return `${Math.floor(hours / 24)} 天前`;
  return date.toLocaleDateString('zh-CN');
}
