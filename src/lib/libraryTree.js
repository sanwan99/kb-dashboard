import { READABLE_EXTS } from './fileTypes.js';
import { ACTIVE_LIBRARY_SOURCES, parentPath, scopeOptions } from './libraryState.js';

export function fileTreeLocation(file) {
  if (!file || !ACTIVE_LIBRARY_SOURCES.includes(file.source) || typeof file.path !== 'string') return null;
  const path = file.path.replace(/^\/+/, '');
  if (!path || (file.source === 'custom' && !path.includes('/'))) return null;
  const group = path.includes('/') ? path.split('/')[0] : '';
  return { view: 'browse', browse: file.source, scope: group ? `${file.source}:${group}` : file.source, folder: parentPath(path), source: file.source, path, q: null, panel: null, retired: null };
}

export function browseRoot(state) {
  const scope = scopeOptions(state.scope);
  const group = state.browseSource === 'work' ? scope.project : scope.mount;
  return group || state.folder.split('/').filter(Boolean)[0] || '';
}

export function isInsideDirectory(path, root) {
  return !root || path === root || path.startsWith(`${root}/`);
}

export function directoryAncestors(path, root = '') {
  if (!isInsideDirectory(path, root)) return [];
  const parts = path.split('/').filter(Boolean);
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'))
    .filter((item) => item !== root && isInsideDirectory(item, root));
}

export function treeRevealStatus(path, root, entries, directories) {
  if (!isInsideDirectory(path, root)) return 'missing';
  let current = entries;
  for (const ancestor of directoryAncestors(parentPath(path), root)) {
    const entry = current.find((item) => item.path === ancestor && item.type === 'dir');
    if (!entry || entry.available === false) return 'missing';
    const directory = directories[ancestor];
    if (!directory || directory.status === 'loading') return 'pending';
    if (directory.status === 'error') return 'error';
    current = directory.entries;
  }
  return current.some((entry) => entry.path === path && entry.type !== 'dir' && entry.available !== false) ? 'ready' : 'missing';
}

export function readableEntries(entries = []) {
  return entries.filter((entry) => entry.type === 'dir' || READABLE_EXTS.has(entry.ext));
}

export function visibleTreeRows(entries, expanded, directories, parent = '', level = 1) {
  const rows = [];
  entries.forEach((entry, index) => {
    rows.push({ entry, parent, level, position: index + 1, siblings: entries.length });
    if (entry.type !== 'dir' || !expanded.has(entry.path) || entry.available === false) return;
    const directory = directories[entry.path];
    if (directory?.status === 'ready' && directory.entries.length) {
      rows.push(...visibleTreeRows(directory.entries, expanded, directories, entry.path, level + 1));
    } else {
      rows.push({ parent: entry.path, level: level + 1, status: directory?.status === 'ready' ? 'empty' : directory?.status || 'loading', error: directory?.error });
    }
  });
  return rows;
}
