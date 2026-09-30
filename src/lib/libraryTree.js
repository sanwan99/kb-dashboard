import { READABLE_EXTS } from './fileTypes.js';
import { scopeOptions } from './libraryState.js';

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
