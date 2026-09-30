import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/primitives.jsx';
import { MarkdownView } from '../components/ReaderPanel.jsx';
import LibraryDialog from '../components/LibraryDialog.jsx';
import LibrarySources from '../components/LibrarySources.jsx';
import LibrarySettings from '../components/LibrarySettings.jsx';
import LibrarySplitPane from '../components/LibrarySplitPane.jsx';
import LibraryHighlight from '../components/LibraryHighlight.jsx';
import LibraryTree from '../components/LibraryTree.jsx';
import { getSources, getTree, getFile, getRecent, search, getSearchStats, subscribeFileEvents } from '../lib/api.js';
import { usePrefs } from '../lib/usePrefs.js';
import { useContextMenu } from '../lib/useContextMenu.jsx';
import { buildFileMenuItems, openWithApp, revealInFinder, buildAbsPathFor, copyToClipboard } from '../lib/fileActions.js';
import { READABLE_EXTS } from '../lib/fileTypes.js';
import { ACTIVE_LIBRARY_SOURCES, parseLibraryState, scopeOptions, matchesScope, fileIdentity, fileTitle, sourceLabel, relativeTime, parentPath } from '../lib/libraryState.js';
import useLibraryRecent from '../lib/useLibraryRecent.js';
import useLiquidGlass from '../lib/useLiquidGlass.js';
import { browseRoot, isInsideDirectory } from '../lib/libraryTree.js';
import brand from '../assets/workspace-mark.png';
import '../styles/library.css';
import '../styles/liquid-glass.css';

const PAGE_SIZE = 40;
const emptyResults = { items: [], total: 0, nextOffset: 0, hasMore: false, label: '搜索结果' };
const isAbort = (error) => error?.name === 'AbortError';

function Busy({ label = '正在加载…' }) {
  return <div className="library-busy" role="status"><span className="library-spinner" />{label}</div>;
}

function Notice({ title, children, action, onAction, icon = 'search' }) {
  return <div className="library-empty"><Icon name={icon} size={33} /><h2>{title}</h2>{children && <p>{children}</p>}{action && <button type="button" className="library-button" onClick={onAction}>{action}</button>}</div>;
}

export default function Library() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = useMemo(() => parseLibraryState(location.search), [location.search]);
  const prefs = usePrefs();
  const rootRef = useRef(null);
  useLiquidGlass(rootRef, prefs.surface === 'liquid', prefs.glassIntensity);
  const recent = useLibraryRecent();
  const contextMenu = useContextMenu();
  const [sources, setSources] = useState([]);
  const [projects, setProjects] = useState([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const [disconnected, setDisconnected] = useState(false);
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [draft, setDraft] = useState(state.q);
  const [results, setResults] = useState(emptyResults);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultError, setResultError] = useState(null);
  const [pageError, setPageError] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [fileVersion, setFileVersion] = useState(0);
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [stats, setStats] = useState(null);
  const [outdated, setOutdated] = useState(false);
  const [focused, setFocused] = useState(false);
  const [toc, setToc] = useState({ toc: [], activeId: null, jumpTo: () => {} });
  const [tocOpen, setTocOpen] = useState(false);
  const [modal, setModalState] = useState(null);
  const [toast, setToast] = useState('');
  const [opening, setOpening] = useState(false);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const stateRef = useRef(state);
  const catalogSequence = useRef(0);
  const querySequence = useRef(0);
  const fileSequence = useRef(0);
  const pageController = useRef(null);
  const pageBusy = useRef(false);
  const modalOpener = useRef(null);
  const restoreAttempted = useRef(false);
  const mounts = useMemo(() => sources.find((source) => source.id === 'custom')?.mounts || [], [sources]);
  const enabledSources = useMemo(() => ACTIVE_LIBRARY_SOURCES.filter((source) => prefs.sources[source] !== false), [prefs.sources]);
  const enabledKey = enabledSources.join(',');
  const directoryRoot = browseRoot(state);
  const queryKey = JSON.stringify([state.q, state.scope, state.view, state.browseSource, state.folder, enabledKey, catalogVersion, refreshVersion]);
  const recentItems = useMemo(() => recent.items.filter((item) => enabledSources.includes(item.source) && matchesScope(item, state.scope)), [recent.items, enabledSources, state.scope]);
  const recentDependency = state.view === 'recent' ? recentItems : null;
  const selected = state.source && state.path ? { source: state.source, path: state.path } : null;
  const selectedId = fileIdentity(selected);
  const selectedTitle = file ? fileTitle(file) : fileTitle(results.items.find((item) => fileIdentity(item) === selectedId) || recent.items.find((item) => fileIdentity(item) === selectedId) || selected);
  const retired = new URLSearchParams(location.search).get('retired');
  stateRef.current = state;

  const updateLocation = useCallback((patch, { replace = false } = {}) => {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === null || value === '' || (key === 'scope' && value === 'all') || (key === 'view' && value === 'search')) params.delete(key);
      else params.set(key, String(value));
    }
    const next = params.toString();
    if (location.pathname !== '/' || next !== location.search.replace(/^\?/, '')) navigate({ pathname: '/', search: next ? `?${next}` : '' }, { replace });
  }, [location.pathname, location.search, navigate]);

  const showModal = (value) => {
    if (value && !modal) modalOpener.current = document.activeElement;
    setModalState(value);
    contextMenu.close();
  };
  const closeModal = () => { setModalState(null); if (state.panel) updateLocation({ panel: null }, { replace: true }); };

  const refreshCatalog = useCallback(async () => {
    const sequence = ++catalogSequence.current;
    const [sourceResult, projectResult, indexResult] = await Promise.allSettled([getSources(), getTree('work'), getSearchStats()]);
    if (sequence !== catalogSequence.current) return;
    if (sourceResult.status === 'rejected') {
      setCatalogError(sourceResult.reason);
      throw sourceResult.reason;
    }
    setSources(sourceResult.value.filter((source) => ACTIVE_LIBRARY_SOURCES.includes(source.id)));
    setProjects(projectResult.status === 'fulfilled' ? projectResult.value.entries.filter((entry) => entry.type === 'dir') : []);
    if (indexResult.status === 'fulfilled') setStats(indexResult.value);
    setCatalogReady(true); setCatalogError(null); setCatalogVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    refreshCatalog().catch(() => {});
    return () => { catalogSequence.current += 1; };
  }, [refreshCatalog]);

  useEffect(() => { setDraft(state.q); }, [state.q]);
  useEffect(() => {
    if (draft === state.q) return;
    const timer = setTimeout(() => updateLocation({ q: draft.trim(), view: 'search', source: null, path: null, retired: null }, { replace: true }), 220);
    return () => clearTimeout(timer);
  }, [draft, state.q, updateLocation]);

  useEffect(() => {
    if (!state.panel) return;
    if (['settings', 'sources'].includes(state.panel)) {
      modalOpener.current = document.activeElement;
      setModalState(state.panel);
    }
  }, [state.panel]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !modal) {
        event.preventDefault(); setFocused(false); searchRef.current?.focus(); searchRef.current?.select();
      }
      if (event.key === 'Escape' && !modal) { setFocused(false); setTocOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  useEffect(() => {
    if (!catalogReady || restoreAttempted.current) return;
    restoreAttempted.current = true;
    if (!prefs.behavior.restoreLastFile || state.path || state.q || state.view !== 'search' || retired) return;
    const last = recent.items.find((item) => enabledSources.includes(item.source));
    if (last) updateLocation({ view: 'recent', source: last.source, path: last.path }, { replace: true });
  }, [catalogReady, state.path, state.q, state.view, prefs.behavior.restoreLastFile, recent.items, enabledSources, retired, updateLocation]);

  useEffect(() => {
    if (!catalogReady) return;
    const sequence = ++querySequence.current;
    const controller = new AbortController();
    pageController.current?.abort(); pageBusy.current = false;
    setLoadingMore(false); setResultError(null); setPageError(null); setOutdated(false);
    const options = scopeOptions(state.scope, enabledSources);
    if (!options.sources.length || (state.view === 'browse' && !enabledSources.includes(state.browseSource))) {
      setResults({ ...emptyResults, key: queryKey, label: '资料来源已暂停' }); setLoading(false);
      return () => controller.abort();
    }
    if (state.view === 'recent') {
      setResults({ ...emptyResults, key: queryKey, items: recentItems, total: recentItems.length, label: '最近打开' }); setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const load = async () => {
      if (state.view === 'browse') {
        const data = await getTree(state.browseSource, directoryRoot, { signal: controller.signal });
        const entries = data.entries.filter((entry) => entry.type === 'dir' || READABLE_EXTS.has(entry.ext));
        return { ...emptyResults, items: entries.map((entry) => ({ ...entry, source: state.browseSource, title: entry.name })), total: entries.length, label: '项目资料' };
      }
      if (!state.q.trim()) {
        const values = await Promise.allSettled(options.sources.map(async (source) => {
          const data = await getRecent(source, 60, { signal: controller.signal, project: options.project, mount: options.mount });
          return data.items.map((item) => ({ ...item, source, title: fileTitle(item) }));
        }));
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (values.every((value) => value.status === 'rejected')) throw values[0].reason;
        const items = values.flatMap((value) => value.status === 'fulfilled' ? value.value : []).filter((item) => matchesScope(item, state.scope)).sort((a, b) => new Date(b.mtime) - new Date(a.mtime)).slice(0, 60);
        return { ...emptyResults, items, total: items.length, label: '最近修改' };
      }
      const data = await search(state.q, { ...options, limit: PAGE_SIZE, signal: controller.signal });
      return { ...data, items: data.results, label: '搜索结果', stats: data };
    };
    load().then((data) => {
      if (sequence !== querySequence.current || controller.signal.aborted) return;
      setResults({ ...data, key: queryKey }); if (data.stats) setStats(data.stats);
      setOutdated(Boolean(data.dirty));
    }).catch((error) => {
      if (sequence === querySequence.current && !isAbort(error)) { setResultError(error); setResults(emptyResults); }
    }).finally(() => { if (sequence === querySequence.current) setLoading(false); });
    return () => { controller.abort(); pageController.current?.abort(); };
  }, [catalogReady, catalogVersion, state.q, state.scope, state.view, state.browseSource, state.folder, enabledKey, refreshVersion, recentDependency]);

  useEffect(() => {
    if (loading || resultError || results.key !== queryKey || state.view !== 'search' || !state.q || state.path || !results.items.length) return;
    const first = results.items[0];
    updateLocation({ source: first.source, path: first.path }, { replace: true });
  }, [loading, resultError, state.view, state.q, state.path, results.items, results.key, queryKey, updateLocation]);

  useEffect(() => {
    const sequence = ++fileSequence.current;
    const controller = new AbortController();
    setFile(null); setFileError(null); setToc({ toc: [], activeId: null, jumpTo: () => {} }); setTocOpen(false);
    if (!state.source || !state.path || !enabledSources.includes(state.source)) { setFileLoading(false); return () => controller.abort(); }
    setFileLoading(true);
    getFile(state.source, state.path, { signal: controller.signal }).then((data) => {
      if (sequence !== fileSequence.current || controller.signal.aborted) return;
      setFile(data); if (!data.binary) recent.record(data);
    }).catch((error) => { if (sequence === fileSequence.current && !isAbort(error)) setFileError(error); })
      .finally(() => { if (sequence === fileSequence.current) setFileLoading(false); });
    return () => controller.abort();
  }, [state.source, state.path, enabledKey, fileVersion, catalogVersion, recent.record]);

  useEffect(() => {
    let directoryTimer;
    let needsReconnect = false;
    const unsubscribe = subscribeFileEvents((event) => {
      const current = stateRef.current;
      if (event.type === 'reindex') { if (current.q) setOutdated(true); return; }
      if (!ACTIVE_LIBRARY_SOURCES.includes(event.source)) return;
      if (current.q) setOutdated(true);
      const targetsFile = event.path === current.path || (event.kind === 'dir' && event.type === 'unlink' && current.path?.startsWith(`${event.path}/`));
      if (event.source === current.source && targetsFile) setFileVersion((version) => version + 1);
      if (current.view === 'browse' && event.source === current.browseSource && isInsideDirectory(event.path, browseRoot(current))) {
        clearTimeout(directoryTimer);
        directoryTimer = setTimeout(() => setRefreshVersion((version) => version + 1), 350);
      }
    }, (connected) => {
      setDisconnected(!connected);
      if (!connected) needsReconnect = true;
      else if (needsReconnect) {
        needsReconnect = false;
        refreshCatalog().catch(() => {});
      }
    });
    return () => { unsubscribe(); clearTimeout(directoryTimer); };
  }, [refreshCatalog]);

  const openFile = (item, { external = false, replace = false } = {}) => {
    contextMenu.close(); setModalState(null);
    if (external) {
      setDraft('');
      updateLocation({ q: null, source: item.source, path: item.path, scope: 'all', view: 'browse', browse: item.source, folder: parentPath(item.path), panel: null, retired: null }, { replace });
    } else updateLocation({ source: item.source, path: item.path, panel: null, retired: null }, { replace });
  };

  const changeScope = (scope) => {
    const options = scopeOptions(scope);
    const browse = options.sources[0] || 'work';
    updateLocation({ scope, source: null, path: null, ...(state.view === 'browse' ? { browse, folder: options.project || options.mount || '' } : {}) });
  };

  const changeView = (view) => {
    setFocused(false); setTocOpen(false); setDraft('');
    const patch = { view, q: null, retired: null };
    if (view === 'browse') { patch.browse = state.source || scopeOptions(state.scope).sources[0] || 'work'; patch.folder = state.path ? parentPath(state.path) : scopeOptions(state.scope).project || scopeOptions(state.scope).mount || ''; }
    updateLocation(patch);
  };

  const onTrashed = (source, path) => {
    recent.remove({ source, path });
    if (state.source === source && (state.path === path || state.path?.startsWith(`${path}/`))) updateLocation({ source: null, path: null }, { replace: true });
    setOutdated(Boolean(state.q)); setRefreshVersion((version) => version + 1);
  };

  const menuFor = (event, item) => {
    const items = buildFileMenuItems({ source: item.source, relPath: item.path, isDir: item.type === 'dir', onTrashed: (path) => onTrashed(item.source, path) });
    if (state.view === 'recent') items.unshift({ label: '从最近打开中移除', icon: 'x', onClick: () => recent.remove(item) }, { divider: true });
    contextMenu.open(event, items);
  };

  const copyPath = async () => {
    if (!selected) return;
    const absolute = await buildAbsPathFor(selected.source, selected.path);
    const text = absolute || selected.path;
    if (await copyToClipboard(text)) setToast(absolute ? '已复制文件路径' : '已复制相对路径');
    else showModal({ type: 'copy', text });
  };

  const openEditor = async () => {
    if (!selected || opening) return;
    setOpening(true);
    try { await openWithApp({ source: selected.source, path: selected.path }); setToast('已请求在 Typora 中打开'); }
    catch (error) { setToast(error.message); }
    finally { setOpening(false); }
  };

  const loadMore = async () => {
    if (pageBusy.current || !results.hasMore || outdated) return;
    pageBusy.current = true; setLoadingMore(true); setPageError(null);
    const sequence = querySequence.current;
    const previousCount = results.items.length;
    const controller = new AbortController(); pageController.current = controller;
    try {
      const data = await search(state.q, { ...scopeOptions(state.scope, enabledSources), limit: PAGE_SIZE, offset: results.nextOffset, signal: controller.signal });
      if (sequence !== querySequence.current || controller.signal.aborted) return;
      if (results.lastBuilt && data.lastBuilt !== results.lastBuilt) { setOutdated(true); return; }
      setResults((previous) => {
        const seen = new Set(previous.items.map(fileIdentity));
        return { ...data, key: previous.key, label: '搜索结果', items: [...previous.items, ...data.results.filter((item) => !seen.has(fileIdentity(item)))] };
      });
      requestAnimationFrame(() => listRef.current?.querySelectorAll('.library-result')[previousCount]?.focus());
    } catch (error) { if (!isAbort(error) && sequence === querySequence.current) setPageError(error); }
    finally { if (sequence === querySequence.current) { pageBusy.current = false; setLoadingMore(false); } }
  };

  const moveResult = (event, index) => {
    const next = { ArrowDown: Math.min(results.items.length - 1, index + 1), ArrowUp: Math.max(0, index - 1), Home: 0, End: results.items.length - 1 }[event.key];
    if (next === undefined || next < 0) return;
    event.preventDefault();
    const item = results.items[next];
    listRef.current?.querySelectorAll('.library-result')[next]?.focus();
    if (item.type !== 'dir' && item.available !== false) openFile(item, { replace: true });
  };

  const chooseResult = (item) => openFile(item);
  const enabledForScope = scopeOptions(state.scope, enabledSources).sources;
  const pendingQuery = draft.trim() !== state.q;
  const canChoose = !loading && !pendingQuery && results.key === queryKey;
  const tabStop = Math.max(0, results.items.findIndex((item) => fileIdentity(item) === selectedId));
  const groupOptions = [{ value: 'all', label: '全部项目与目录' }, { value: 'work', label: '全部项目文档' }, { value: 'custom', label: '全部本地目录' }, ...projects.map((project) => ({ value: `work:${project.name}`, label: project.name })), ...mounts.map((mount) => ({ value: `custom:${mount.id}`, label: `${mount.name}${mount.available ? '' : '（不可用）'}` }))];
  const safeScope = groupOptions.some((option) => option.value === state.scope) ? state.scope : 'all';

  return <div ref={rootRef} className={`library-root ${focused ? 'is-focused' : ''}`}>
    <div className="library-shell" inert={modal ? '' : undefined} aria-hidden={modal ? true : undefined}>
      <aside className="library-rail" aria-label="主导航"><div className="library-window-drag" /><button type="button" className="library-brand" aria-label="资料检索台" onClick={() => { setDraft(''); updateLocation({ q: null, view: 'search', scope: 'all' }); }}><img src={brand} alt="资料检索台图标" /></button>
        {[['search', 'search', '检索'], ['browse', 'folder', '项目资料'], ['recent', 'clock', '最近打开']].map(([view, icon, label]) => <button key={view} type="button" className={`library-rail-link ${state.view === view ? 'active' : ''}`} aria-current={state.view === view ? 'page' : undefined} onClick={() => changeView(view)}><Icon name={icon} size={23} /><span>{label}</span></button>)}
        <button type="button" className="library-rail-link" onClick={() => showModal('sources')}><Icon name="inbox" size={23} /><span>资料来源</span></button>
        <button type="button" className="library-rail-link bottom" onClick={() => showModal('settings')}><Icon name="settings" size={23} /><span>设置</span></button>
      </aside>
      <main className="library-main"><header className="library-topbar"><h1>资料检索台</h1><button type="button" className="library-text-button" onClick={() => changeView('browse')}>项目资料</button><button type="button" className="library-text-button" onClick={() => showModal('sources')}>资料来源</button><button type="button" className="library-key-hint" onClick={() => { searchRef.current?.focus(); searchRef.current?.select(); }}><kbd>⌘ K</kbd><span>快速检索</span></button></header>
        {['learn', 'obsidian'].includes(retired) && <div className="library-notice">{retired === 'learn' ? '学习项目' : 'Obsidian'} 已停用，原文件保留。需要时可从资料来源重新连接目录。<button type="button" className="library-icon-button" aria-label="关闭提示" onClick={() => updateLocation({ retired: null }, { replace: true })}><Icon name="x" size={16} /></button></div>}
        {(catalogError || disconnected) && <div className="library-notice error" role="alert"><span>本地服务连接中断，正在重连。</span><button type="button" className="library-text-button" onClick={() => refreshCatalog().catch(() => {})}>重新连接</button></div>}
        <section className="library-search-controls"><form className="library-search-form" role="search" onSubmit={(event) => { event.preventDefault(); setOutdated(false); updateLocation({ q: draft.trim(), view: 'search', source: null, path: null }); setRefreshVersion((version) => version + 1); }}><label className="library-search-input"><Icon name="search" size={23} /><input ref={searchRef} aria-label="搜索本地资料" value={draft} maxLength={300} placeholder="搜索文档、接口或关键词…" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'ArrowDown' && canChoose && results.items.length) { event.preventDefault(); listRef.current?.querySelector('.library-tree-row[tabindex="0"], .library-result')?.focus(); } }} />{draft && <button type="button" className="library-icon-button" aria-label="清空搜索" onClick={() => { setDraft(''); updateLocation({ q: null, path: null, source: null, view: 'search' }); searchRef.current?.focus(); }}><Icon name="x" size={18} /></button>}</label><button type="submit" className="library-button primary search-submit">搜索</button></form>
          <div className="library-filters"><div className="library-source-chips">{[['all', '全部资料', 'file'], ['work', '项目文档', 'folder'], ['custom', '本地目录', 'folder-open']].map(([value, label, icon]) => <button type="button" key={value} className={state.scope === value || state.scope.startsWith(`${value}:`) ? 'active' : ''} aria-pressed={state.scope === value || state.scope.startsWith(`${value}:`)} onClick={() => changeScope(value)}><Icon name={icon} size={18} />{label}</button>)}</div><select aria-label="按项目或目录筛选" value={safeScope} onChange={(event) => changeScope(event.target.value)}>{groupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
        </section>
        <LibrarySplitPane focused={focused}>
          <section id="library-results-pane" ref={listRef} className="library-results" aria-label="资料列表" aria-busy={loading || pendingQuery}>
            <div className="library-results-header"><span>{state.view === 'browse' ? '目录树' : results.label}</span><span aria-live="polite">{loading || pendingQuery ? '正在查找…' : `${results.total} ${state.view === 'browse' ? '项 · 当前层级' : '份文档'}`}</span></div>
            {state.view === 'browse' && <div className="library-folder-bar">
              <Icon name="folder-open" size={17} />
              <span title={directoryRoot || (state.browseSource === 'work' ? '项目文档' : '本地目录')}>{state.browseSource === 'custom' && directoryRoot ? mounts.find((mount) => mount.id === directoryRoot)?.name || directoryRoot : directoryRoot || (state.browseSource === 'work' ? '全部项目' : '全部本地目录')}</span>
              {directoryRoot && <button type="button" className="library-text-button" onClick={() => updateLocation({ folder: null, scope: state.browseSource })}>{state.browseSource === 'work' ? '全部项目' : '全部目录'}</button>}
              <button type="button" className="library-icon-button" aria-label="刷新目录树" onClick={() => setRefreshVersion((version) => version + 1)}><Icon name="clock" size={16} /></button>
            </div>}
            {outdated && state.q && <div className="library-refresh-note"><span>资料有更新</span><button type="button" onClick={() => setRefreshVersion((version) => version + 1)}>刷新结果</button></div>}
            {!catalogReady && !catalogError ? <Busy label="正在连接资料来源…" /> : resultError ? <Notice title="资料暂时无法加载" action="重试" onAction={() => setRefreshVersion((version) => version + 1)}>{resultError.message}</Notice> : !enabledForScope.length ? <Notice title="资料来源已暂停" action="管理资料来源" onAction={() => showModal('sources')} icon="folder">启用资料来源后即可继续浏览。</Notice> : state.view === 'browse' ? <LibraryTree
              key={`${state.browseSource}:${directoryRoot}`}
              source={state.browseSource}
              rootPath={directoryRoot}
              entries={results.key === queryKey ? results.items : []}
              loading={loading || results.key !== queryKey}
              selectedPath={state.source === state.browseSource ? state.path : null}
              initialFolder={state.folder}
              refreshKey={`${catalogVersion}:${refreshVersion}`}
              onSelect={openFile}
              onContextMenu={menuFor}
            /> : loading && !results.items.length ? <Busy label={state.q && !stats?.ready ? '首次检索，正在准备本地索引…' : '正在查找资料…'} /> : !results.items.length && !loading ? <Notice title={state.view === 'recent' ? '还没有阅读记录' : state.q ? '没有找到相关资料' : '这里暂时没有文档'} action={state.q ? '清空关键词' : '浏览项目资料'} onAction={() => { if (state.q) { setDraft(''); updateLocation({ q: null, source: null, path: null }); } else changeView('browse'); }}>{state.q ? '试试更短的关键词，或切换来源范围。' : '选择一个目录，打开 Markdown 或 SQL 文件。'}</Notice> : <div className={`library-result-list ${loading || pendingQuery ? 'pending' : ''}`}>
              {results.items.map((item, index) => <button type="button" className={`library-result ${fileIdentity(item) === selectedId ? 'active' : ''} ${item.type === 'dir' ? 'directory' : ''}`} key={fileIdentity(item)} disabled={!canChoose || item.available === false} aria-pressed={item.type !== 'dir' ? fileIdentity(item) === selectedId : undefined} tabIndex={index === tabStop ? 0 : -1} onClick={() => chooseResult(item)} onKeyDown={(event) => moveResult(event, index)} onContextMenu={(event) => menuFor(event, item)}>
                <Icon name={item.type === 'dir' ? 'folder' : 'file'} size={23} /><span className="library-result-copy"><strong><LibraryHighlight text={fileTitle(item)} query={state.q} /></strong><span className="library-result-meta">{item.type === 'dir' ? item.available === false ? '目录不可用' : '打开目录' : `${sourceLabel(item, mounts)}${item.mtime ? ` · ${relativeTime(item.mtime)}` : ''}`}</span>{item.preview && <span className="library-result-excerpt"><LibraryHighlight text={item.preview} query={state.q} /></span>}{!item.preview && item.type !== 'dir' && <span className="library-result-path" title={item.path}>{item.path}</span>}</span>{item.type === 'dir' && <Icon name="chev-r" size={16} />}
              </button>)}
            </div>}
            {pageError && <div className="library-refresh-note error" role="alert"><span>加载更多失败</span><button type="button" onClick={loadMore}>重试</button></div>}
            {results.hasMore && !loading && <button type="button" className="library-load-more" disabled={loadingMore || outdated} onClick={loadMore}><Icon name="chev-d" size={16} />{loadingMore ? '正在加载…' : outdated ? '刷新后继续加载' : '加载更多'}<span>{results.items.length} / {results.total}</span></button>}
            {state.view !== 'browse' && !results.hasMore && results.items.length > 0 && !loading && <div className="library-list-end">{state.q ? `已显示全部 ${results.total} 条结果` : results.label === '最近修改' ? '按修改时间排列' : '已到列表末尾'}</div>}
          </section>
          <section className="library-reader" aria-label="文档预览">
            {selected && <div className="library-reader-toolbar"><div className="library-breadcrumb"><span>{sourceLabel(selected, mounts)}</span><span>/</span><span title={state.path}>{state.path.split('/').slice(1, -1).slice(-2).join(' / ') || '文档'}</span></div><div className="library-reader-actions"><button type="button" className="library-text-button" aria-pressed={focused} onClick={() => setFocused(!focused)}><Icon name="book" size={18} /><span>{focused ? '退出专注' : '专注阅读'}</span></button>{toc.toc.length > 0 && <button type="button" className="library-text-button" aria-expanded={tocOpen} onClick={() => setTocOpen(!tocOpen)}><Icon name="list" size={18} /><span>目录</span></button>}<button type="button" className="library-text-button" onClick={copyPath}><Icon name="link" size={17} /><span>复制路径</span></button><button type="button" className="library-button primary" disabled={opening} onClick={openEditor}><Icon name="play" size={15} />{opening ? '正在打开…' : '用 Typora 打开'}</button></div></div>}
            {tocOpen && <nav className="library-toc" aria-label="文档目录">{toc.toc.map((entry) => <button type="button" key={entry.id} aria-current={toc.activeId === entry.id ? 'location' : undefined} onClick={() => { toc.jumpTo(entry.id); setTocOpen(false); }}>{entry.text}</button>)}</nav>}
            {!selected ? <Notice title="找到资料，接着工作" icon="book">输入关键词搜索项目文档，或从左侧打开一份资料。支持 Markdown、SQL 和流程图预览。</Notice> : !enabledSources.includes(state.source) ? <Notice title="此来源已暂停显示" action="管理资料来源" onAction={() => showModal('sources')} icon="folder" /> : fileLoading ? <Busy label="正在打开文档…" /> : fileError ? <div className="library-file-error"><Notice title={fileError.status === 404 ? '文档可能已移动' : fileError.status === 413 ? '文件较大，适合在编辑器中阅读' : '文档暂时无法打开'} action="重新加载" onAction={() => setFileVersion((version) => version + 1)}>{fileError.message}</Notice><div className="library-error-actions"><button type="button" className="library-text-button" onClick={() => { recent.remove(selected); setRefreshVersion((version) => version + 1); updateLocation({ source: null, path: null }, { replace: true }); }}>移除这条阅读记录</button><button type="button" className="library-text-button" onClick={() => openFile(selected, { external: true })}>查看所在目录</button></div></div> : file?.binary ? <Notice title="此文件暂不支持直接预览" icon="file" action="在 Finder 中显示" onAction={() => revealInFinder({ source: state.source, path: state.path }).catch((error) => setToast(error.message))} /> : file ? <MarkdownView key={selectedId} path={state.path} file={file} title={selectedTitle} presentation="library" onToc={setToc} /> : null}
          </section>
        </LibrarySplitPane>
        <footer className="library-status"><span><span className={`library-status-dot ${catalogError || disconnected ? 'error' : ''}`} />{catalogError || disconnected ? '服务连接中断' : '本地资料'}</span><span>{stats?.ready ? `${stats.docCount} 份文档已索引` : '首次搜索时建立索引'}</span>{stats?.skippedCustomMounts?.length > 0 && <button type="button" onClick={() => showModal('sources')}>部分大目录仅支持浏览</button>}</footer>
      </main>
    </div>
    {contextMenu.Element}
    {toast && <div className="library-toast" role="status"><Icon name="check" size={17} />{toast}</div>}
    {modal === 'sources' && <LibraryDialog title="资料来源" onClose={closeModal} returnFocus={modalOpener.current} wide><LibrarySources sources={sources} mounts={mounts} onRefresh={refreshCatalog} onRemoved={(id) => { onTrashed('custom', id); if (state.browseSource === 'custom' && (state.folder === id || state.folder.startsWith(`${id}/`))) updateLocation({ folder: null, scope: 'custom', source: null, path: null }, { replace: true }); }} notify={setToast} /></LibraryDialog>}
    {modal === 'settings' && <LibraryDialog title="阅读设置" onClose={closeModal} returnFocus={modalOpener.current}><LibrarySettings /></LibraryDialog>}
    {modal?.type === 'copy' && <LibraryDialog title="复制文件路径" onClose={closeModal} returnFocus={modalOpener.current}><p className="library-dialog-description">浏览器未允许直接复制，请选中下面的路径复制。</p><textarea className="library-copy-field" aria-label="文件路径" readOnly value={modal.text} onFocus={(event) => event.target.select()} /></LibraryDialog>}
  </div>;
}
