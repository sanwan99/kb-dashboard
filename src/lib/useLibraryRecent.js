import { useCallback, useState } from 'react';
import { ACTIVE_LIBRARY_SOURCES, fileIdentity, fileTitle } from './libraryState.js';

const STORAGE_KEY = 'kb-library-recent-v1';
const CAPACITY = 50;

function readRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (Array.isArray(raw)) return raw.filter((item) => ACTIVE_LIBRARY_SOURCES.includes(item?.source) && typeof item?.path === 'string').slice(0, CAPACITY);
    const legacy = ACTIVE_LIBRARY_SOURCES.flatMap((source) => {
      const paths = JSON.parse(localStorage.getItem(`kb-recent-${source}`) || '[]');
      return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string').map((path) => ({ source, path, title: fileTitle({ path }) })) : [];
    });
    return legacy.slice(0, CAPACITY);
  } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* 只影响刷新后记忆。 */ }
}

export default function useLibraryRecent() {
  const [items, setItems] = useState(readRecent);
  const record = useCallback((file) => {
    if (!fileIdentity(file)) return;
    setItems((previous) => {
      const old = previous.find((item) => fileIdentity(item) === fileIdentity(file));
      const nextItem = { source: file.source, path: file.path, title: fileTitle(file), mtime: file.mtime, size: file.size, openedAt: old && previous[0] === old ? old.openedAt : new Date().toISOString() };
      if (old && previous[0] === old && JSON.stringify(old) === JSON.stringify(nextItem)) return previous;
      const next = [nextItem, ...previous.filter((item) => fileIdentity(item) !== fileIdentity(file))].slice(0, CAPACITY);
      save(next);
      return next;
    });
  }, []);
  const remove = useCallback((file) => {
    setItems((previous) => { const next = previous.filter((item) => item.source !== file.source || (item.path !== file.path && !item.path.startsWith(`${file.path}/`))); save(next); return next; });
  }, []);
  return { items, record, remove };
}
