import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './primitives.jsx';
import { getTree } from '../lib/api.js';
import { directoryAncestors, isInsideDirectory, readableEntries, visibleTreeRows } from '../lib/libraryTree.js';
import { parentPath } from '../lib/libraryState.js';

export default function LibraryTree({ source, rootPath, entries, loading, selectedPath, initialFolder, refreshKey, onSelect, onContextMenu }) {
  const storageKey = `kb-library-tree-v1:${source}:${rootPath}`;
  const previousSelection = useRef(selectedPath);
  const [expanded, setExpanded] = useState(() => {
    let saved = [];
    let restoreSelection = false;
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const paths = Array.isArray(value) ? value : value?.expanded;
      if (Array.isArray(paths)) saved = paths.filter((path) => typeof path === 'string' && isInsideDirectory(path, rootPath));
      restoreSelection = value !== null && !Array.isArray(value) && value.selection === selectedPath;
    } catch { /* 无存储权限时仍可展开当前目录。 */ }
    return new Set([...saved, ...(restoreSelection ? [] : directoryAncestors(selectedPath ? parentPath(selectedPath) : initialFolder, rootPath))]);
  });
  const [directories, setDirectories] = useState({});
  const [focusedPath, setFocusedPath] = useState(selectedPath || '');
  const treeRef = useRef(null);
  const directoryRef = useRef({});
  const requests = useRef(new Map());
  const mounted = useRef(true);
  const focusAfterLoad = useRef(null);

  const updateDirectory = (path, value) => {
    directoryRef.current = { ...directoryRef.current, [path]: value };
    setDirectories(directoryRef.current);
  };

  const loadDirectory = useCallback((path, retry = false) => {
    if (requests.current.has(path) || (!retry && directoryRef.current[path])) return;
    const controller = new AbortController();
    requests.current.set(path, controller);
    updateDirectory(path, { status: 'loading' });
    getTree(source, path, { signal: controller.signal }).then((data) => {
      if (controller.signal.aborted || !mounted.current) return;
      updateDirectory(path, { status: 'ready', entries: readableEntries(data.entries) });
    }).catch((error) => {
      if (controller.signal.aborted || !mounted.current) return;
      updateDirectory(path, { status: 'error', error });
    }).finally(() => {
      if (requests.current.get(path) === controller) requests.current.delete(path);
    });
  }, [source]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const controller of requests.current.values()) controller.abort();
      requests.current.clear();
    };
  }, []);

  useEffect(() => {
    for (const controller of requests.current.values()) controller.abort();
    requests.current.clear();
    directoryRef.current = {};
    setDirectories({});
  }, [refreshKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ expanded: [...expanded].slice(-200), selection: selectedPath })); } catch { /* 保留当前窗口状态。 */ }
  }, [expanded, storageKey, selectedPath]);

  useEffect(() => {
    if (previousSelection.current === selectedPath) return;
    previousSelection.current = selectedPath;
    if (!selectedPath) return;
    setExpanded((previous) => new Set([...previous, ...directoryAncestors(parentPath(selectedPath), rootPath)]));
    setFocusedPath(selectedPath);
  }, [selectedPath, rootPath]);

  const rows = useMemo(() => visibleTreeRows(entries, expanded, directories, rootPath), [entries, expanded, directories, rootPath]);
  const items = rows.filter((row) => row.entry);
  const tabStop = items.some(({ entry }) => entry.path === focusedPath) ? focusedPath : items[0]?.entry.path;
  const expandable = items.some(({ entry }) => entry.type === 'dir' && expanded.has(entry.path));

  useEffect(() => {
    if (loading) return;
    for (const { entry } of items) {
      if (entry.type === 'dir' && entry.available !== false && expanded.has(entry.path) && !directoryRef.current[entry.path]) loadDirectory(entry.path);
    }
  }, [rows, expanded, loading, loadDirectory]);

  const focusRow = (path) => {
    focusAfterLoad.current = null;
    setFocusedPath(path);
    const element = [...(treeRef.current?.querySelectorAll('[role="treeitem"]') || [])].find((item) => item.dataset.path === path);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({ block: 'nearest' });
  };

  useEffect(() => {
    const path = focusAfterLoad.current;
    if (!path) return;
    const first = directoryRef.current[path]?.entries?.[0];
    if (first && expanded.has(path)) focusRow(first.path);
  }, [directories, expanded]);

  const toggle = (entry, open = !expanded.has(entry.path)) => {
    if (entry.available === false) return;
    focusAfterLoad.current = null;
    setExpanded((previous) => {
      const next = new Set(previous);
      if (open) next.add(entry.path);
      else next.delete(entry.path);
      return next;
    });
    if (open && directoryRef.current[entry.path]?.status === 'error') loadDirectory(entry.path, true);
  };

  const onKeyDown = (event, row) => {
    const { entry, parent } = row;
    const index = items.findIndex((item) => item.entry.path === entry.path);
    const target = { ArrowDown: items[index + 1], ArrowUp: items[index - 1], Home: items[0], End: items.at(-1) };
    if (event.key in target) {
      event.preventDefault();
      if (target[event.key]) focusRow(target[event.key].entry.path);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (entry.type !== 'dir' || entry.available === false) return;
      if (!expanded.has(entry.path)) toggle(entry, true);
      else {
        const first = directoryRef.current[entry.path]?.entries?.[0];
        if (first) focusRow(first.path);
        else if (!directoryRef.current[entry.path] || directoryRef.current[entry.path].status === 'loading') focusAfterLoad.current = entry.path;
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (entry.type === 'dir' && expanded.has(entry.path)) toggle(entry, false);
      else if (parent !== rootPath) focusRow(parent);
    }
  };

  return <div className="library-directory-tree">
    <div className="library-tree-tools"><span>逐级展开目录</span><button type="button" className="library-text-button" disabled={!expandable} onClick={() => { focusAfterLoad.current = null; setExpanded(new Set()); setFocusedPath(entries[0]?.path || ''); }}>全部折叠</button></div>
    {loading && !entries.length ? <div className="library-tree-note" role="status"><span className="library-spinner" />正在加载目录…</div> : !entries.length ? <div className="library-tree-note">此目录没有可预览的文件</div> : <div ref={treeRef} role="tree" aria-label="资料目录树" aria-busy={loading} className="library-tree" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) focusAfterLoad.current = null; }}>
      {rows.map((row) => {
        const indent = Math.min(row.level - 1, 9);
        if (!row.entry) return <div key={`status:${row.parent}`} className="library-tree-note" style={{ '--tree-depth': indent }} role={row.status === 'error' ? 'alert' : 'status'}>
          {row.status === 'loading' ? <><span className="library-spinner" />正在加载…</> : row.status === 'error' ? <><span title={row.error?.message}>暂时无法加载</span><button type="button" className="library-text-button" aria-label={`重试加载 ${row.parent.split('/').pop()}`} onClick={() => loadDirectory(row.parent, true)}>重试</button></> : '此目录没有可预览的文件'}
        </div>;
        const { entry } = row;
        const isDirectory = entry.type === 'dir';
        const isExpanded = isDirectory && expanded.has(entry.path) && entry.available !== false;
        return <button
          key={entry.path}
          type="button"
          role="treeitem"
          data-path={entry.path}
          aria-label={entry.name}
          aria-level={row.level}
          aria-posinset={row.position}
          aria-setsize={row.siblings}
          aria-expanded={isDirectory ? isExpanded : undefined}
          aria-selected={!isDirectory && entry.path === selectedPath}
          aria-disabled={entry.available === false || loading || undefined}
          tabIndex={entry.path === tabStop ? 0 : -1}
          className={`library-tree-row ${isDirectory ? 'is-directory' : ''} ${entry.path === selectedPath ? 'active' : ''}`}
          style={{ '--tree-depth': indent }}
          title={entry.available === false ? '目录不可用，请检查原路径' : entry.path}
          onFocus={() => setFocusedPath(entry.path)}
          onClick={() => { if (!loading && entry.available !== false) { if (isDirectory) toggle(entry); else onSelect({ ...entry, source }); } }}
          onKeyDown={(event) => onKeyDown(event, row)}
          onContextMenu={(event) => onContextMenu(event, { ...entry, source })}
        >
          <span className={`library-tree-chevron ${isExpanded ? 'expanded' : ''}`} aria-hidden="true">{isDirectory && <Icon name="chev-r" size={14} />}</span>
          <Icon name={isDirectory ? isExpanded ? 'folder-open' : 'folder' : 'file'} size={18} />
          <span className="library-tree-name">{entry.name}</span>
          {entry.available === false && <span className="library-tree-unavailable">不可用</span>}
          {!isDirectory && entry.ext === 'sql' && <span className="library-tree-filetype">SQL</span>}
        </button>;
      })}
    </div>}
  </div>;
}
