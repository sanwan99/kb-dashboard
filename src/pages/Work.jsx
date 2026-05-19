import React, { useEffect, useRef, useState } from 'react';
import { Frame, Icon, SourcePill } from '../components/primitives.jsx';
import { EmptyState, LoadingState, ErrorState, MarkdownView, TocList } from '../components/ReaderPanel.jsx';
import SidePanel from '../components/SidePanel.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import RecentList from '../components/RecentList.jsx';
import useRememberedPath from '../lib/useRememberedPath.js';
import useRecentFiles from '../lib/useRecentFiles.js';
import { useContextMenu } from '../lib/useContextMenu.jsx';
import { buildFileMenuItems } from '../lib/fileActions.js';
import { getTree, getFile, getRecent, subscribeFileEvents } from '../lib/api.js';
import { READABLE_EXTS, MARKDOWN_EXTS } from '../lib/fileTypes.js';

const SOURCE = 'work';

const isSameOrChild = (p, target) => p === target || p.startsWith(target + '/');
const parentOf = (p) => {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/');
};

const WORK_SIDEBAR_WIDTH_KEY = 'kb-work-sidebar-width';
const WORK_SIDEBAR_DEFAULT_WIDTH = 240;
const WORK_SIDEBAR_MIN_WIDTH = 220;
const WORK_SIDEBAR_MAX_WIDTH = 560;

const clampWorkSidebarWidth = (value) => Math.min(
  WORK_SIDEBAR_MAX_WIDTH,
  Math.max(WORK_SIDEBAR_MIN_WIDTH, value),
);

// 识别 <proj>/md/codex/current 目录
const isCodexCurrent = (p) => {
  const parts = p.split('/');
  return (
    parts.length === 4 &&
    parts[1] === 'md' &&
    parts[2] === 'codex' &&
    parts[3] === 'current'
  );
};

const projectOf = (p) => p.split('/')[0];

// ── 左栏：项目列表 + 当前项目目录树（本地过滤） ──────────────
function Sidebar({
  projects,
  selectedProject,
  onSelectProject,
  activeTasks,
  treeMap,
  expanded,
  selectedPath,
  onToggle,
  onSelectFile,
  onTrashed,
}) {
  const [filter, setFilter] = useState('');
  const sidebarRef = useRef(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof localStorage === 'undefined') return WORK_SIDEBAR_DEFAULT_WIDTH;
    const stored = Number(localStorage.getItem(WORK_SIDEBAR_WIDTH_KEY));
    return Number.isFinite(stored) && stored > 0
      ? clampWorkSidebarWidth(stored)
      : WORK_SIDEBAR_DEFAULT_WIDTH;
  });
  const ctx = useContextMenu();
  const q = filter.trim().toLowerCase();

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(WORK_SIDEBAR_WIDTH_KEY, String(Math.round(sidebarWidth)));
  }, [sidebarWidth]);

  const startResize = (e) => {
    e.preventDefault();
    const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
    const onMove = (ev) => {
      setSidebarWidth(clampWorkSidebarWidth(ev.clientX - left));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const renderLevel = (path, depth = 0) => {
    if (!expanded.has(path) && path !== selectedProject) return null;
    const entries = treeMap[path];
    if (!entries) {
      return (
        <div style={{ padding: `3px 6px 3px ${10 + depth * 14}px`, fontSize: 11, color: 'var(--ink-muted)' }}>
          加载中…
        </div>
      );
    }
    const shown = q
      ? entries.filter((e) => e.name.toLowerCase().includes(q) || (e.type === 'dir' && expanded.has(e.path)))
      : entries;
    if (shown.length === 0) return null;
    return shown.map((e) => {
      const isDir = e.type === 'dir';
      const isReadable = e.type === 'file' && READABLE_EXTS.has(e.ext);
      const isExp = expanded.has(e.path);
      const active = selectedPath === e.path;
      const hot = isDir && isCodexCurrent(e.path);
      const taskCount = hot ? (activeTasks[projectOf(e.path)]?.length ?? 0) : null;

      return (
        <React.Fragment key={e.path}>
          <div
            className={`tree-row ${active ? 'active-work' : ''} ${hot ? 'active-work' : ''}`}
            style={{
              gap: 4,
              padding: `3px 6px 3px ${8 + depth * 14}px`,
              cursor: isDir || isReadable ? 'pointer' : 'default',
              ...(hot
                ? {
                    background: 'var(--src-work-bg)',
                    border: '1px solid #ECD9BF',
                    borderRadius: 4,
                    marginTop: 2,
                    marginBottom: 2,
                  }
                : null),
            }}
            onClick={() => (isDir ? onToggle(e.path) : isReadable ? onSelectFile(e.path) : null)}
            onContextMenu={(ev) => ctx.open(ev, buildFileMenuItems({ source: SOURCE, relPath: e.path, isDir, onTrashed }))}
          >
            {isDir ? (
              <Icon name={isExp ? 'chev-d' : 'chev-r'} size={10} color="var(--ink-muted)" />
            ) : (
              <span style={{ width: 10 }} />
            )}
            <Icon
              name={hot ? 'terminal' : isDir ? (isExp ? 'folder-open' : 'folder') : 'file'}
              size={12}
              color={
                hot
                  ? 'var(--src-work)'
                  : active
                    ? 'var(--src-work)'
                    : isDir && isExp
                      ? 'var(--src-work)'
                      : 'var(--ink-muted)'
              }
            />
            <span
              className="kb-mono"
              title={e.name}
              style={{
                fontSize: 12,
                flex: 1,
                minWidth: 0,
                fontWeight: hot ? 600 : 400,
                opacity: !isDir && !isReadable ? 0.5 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {e.name}
              {hot && '/'}
            </span>
            {hot && taskCount > 0 && (
              <span className="badge live" style={{ fontSize: 9.5, padding: '0 5px' }}>
                {taskCount} 🚧
              </span>
            )}
          </div>
          {isDir && renderLevel(e.path, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div
      ref={sidebarRef}
      style={{
        width: sidebarWidth,
        minWidth: WORK_SIDEBAR_MIN_WIDTH,
        maxWidth: WORK_SIDEBAR_MAX_WIDTH,
        flexShrink: 0,
        background: 'var(--bg-tint)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
      }}
    >
      <div
        className="work-sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整左侧目录宽度"
        title="拖动调整左侧目录宽度"
        onMouseDown={startResize}
        style={{
          position: 'absolute',
          top: 0,
          right: -4,
          bottom: 0,
          width: 8,
          cursor: 'col-resize',
          zIndex: 5,
          touchAction: 'none',
        }}
      />
      <div style={{ padding: '12px 12px 8px' }}>
        <SourcePill source="work" />
        <div className="kb-serif" style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>公司项目笔记</div>
        <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>~/work/code/sanwan/notes/</div>
      </div>

      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '8px 14px 4px',
        }}
      >
        项目
      </div>
      <div style={{ padding: '0 6px' }}>
        {projects.map((p) => {
          const selected = selectedProject === p.name;
          const active = activeTasks[p.name]?.length ?? 0;
          return (
            <div
              key={p.name}
              className={`tree-row ${selected ? 'active-work' : ''}`}
              style={{ gap: 6, padding: '4px 8px', cursor: 'pointer' }}
              onClick={() => onSelectProject(p.name)}
              onContextMenu={(ev) => ctx.open(ev, buildFileMenuItems({ source: SOURCE, relPath: p.name, isDir: true, onTrashed }))}
            >
              <Icon name="git" size={12} color={selected ? 'var(--src-work)' : 'var(--ink-muted)'} />
              <span
                className="kb-mono"
                title={p.name}
                style={{
                  fontSize: 12,
                  flex: 1,
                  minWidth: 0,
                  fontWeight: selected ? 600 : 400,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {p.name}
              </span>
              {active > 0 && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    background: 'var(--src-work)',
                    color: '#fff',
                    fontSize: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                  }}
                >
                  {active}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selectedProject && (
        <>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '12px 14px 4px',
            }}
          >
            {selectedProject} · 目录
          </div>
          <div style={{ padding: '4px 8px 0' }}>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="过滤文件名…"
              style={{
                width: '100%',
                height: 22,
                fontSize: 11,
                padding: '0 6px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--bg-raised)',
                color: 'var(--ink)',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
          <div className="kb-scroll" style={{ flex: 1, padding: '4px 6px 10px', fontSize: 11.5 }}>
            {renderLevel(selectedProject, 0)}
          </div>
        </>
      )}
      {ctx.Element}
    </div>
  );
}

// ── 右栏：全部活跃任务 ──────────────────────────────────
function formatRelTime(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function RecentModsBody({ items, selectedPath, onSelect }) {
  if (!items) {
    return <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>加载中…</div>;
  }
  if (items.length === 0) {
    return <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>公司笔记仓里暂无可读文件</div>;
  }
  return (
    <div style={{ padding: '4px 12px 0' }}>
      {items.map((t) => {
        const proj = t.path.split('/')[0] || '';
        const active = selectedPath === t.path;
        return (
          <div
            key={t.path}
            className="kb-card"
            style={{
              padding: 10,
              marginBottom: 6,
              cursor: 'pointer',
              borderColor: active ? 'var(--src-work)' : 'var(--border)',
              borderWidth: active ? 1.5 : 1,
              background: active ? 'var(--bg-raised)' : 'transparent',
            }}
            title={t.path}
            onClick={() => onSelect(t.path)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span className="src-dot work" />
              <span
                className="kb-mono"
                style={{
                  fontSize: 10.5, color: 'var(--src-work)', fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '55%',
                }}
              >
                {proj}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                {formatRelTime(t.mtime)}
              </span>
            </div>
            <div
              className="kb-mono"
              style={{
                fontSize: 11.5, color: 'var(--ink)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {t.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export default function Work() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTasks, setActiveTasks] = useState({});
  const [treeMap, setTreeMap] = useState({});
  const [expanded, setExpanded] = useState(new Set());
  const [selectedPath, setSelectedPath] = useRememberedPath('kb-last-path-work');
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [initError, setInitError] = useState(null);
  const [tocState, setTocState] = useState({ toc: [], activeId: null, jumpTo: () => {} });
  const [recent, , removeRecent] = useRecentFiles('kb-recent-work', selectedPath);
  const [recentMods, setRecentMods] = useState(null);

  // 活跃修改：全 work 源按 mtime 倒序 top 50
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getRecent(SOURCE, 50)
        .then((r) => { if (!cancelled) setRecentMods(r.items || []); })
        .catch(() => { if (!cancelled) setRecentMods([]); });
    };
    load();
    // 订阅文件变更 → 重拉（debounce 简易：1.5s 合并）
    let t = null;
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;
      clearTimeout(t);
      t = setTimeout(load, 1500);
    });
    return () => { cancelled = true; unsub(); clearTimeout(t); };
  }, []);

  // 初始化：项目列表 + 并发拉每个项目的 codex/current
  useEffect(() => {
    getTree(SOURCE, '')
      .then(async ({ entries }) => {
        const projs = entries.filter((e) => e.type === 'dir');
        setProjects(projs);
        if (projs.length) setSelectedProject(projs[0].name);

        const results = await Promise.allSettled(
          projs.map((p) => getTree(SOURCE, `${p.name}/md/codex/current`)),
        );
        const map = {};
        results.forEach((r, i) => {
          map[projs[i].name] =
            r.status === 'fulfilled'
              ? r.value.entries.filter((e) => e.type === 'file' && MARKDOWN_EXTS.has(e.ext))
                  .map((e) => ({ name: e.name, path: e.path, mtime: e.mtime, size: e.size }))
              : [];
        });
        setActiveTasks(map);
      })
      .catch((err) => setInitError(err.message));
  }, []);

  // 切换项目时：预加载 proj → md → codex 让 current 一进来就可见
  useEffect(() => {
    if (!selectedProject) return;
    let cancelled = false;
    (async () => {
      try {
        if (!treeMap[selectedProject]) {
          const { entries } = await getTree(SOURCE, selectedProject);
          if (cancelled) return;
          setTreeMap((m) => ({ ...m, [selectedProject]: entries }));
          if (!entries.some((e) => e.name === 'md' && e.type === 'dir')) return;
        }
        const mdPath = `${selectedProject}/md`;
        setExpanded((s) => new Set(s).add(mdPath));
        if (!treeMap[mdPath]) {
          const { entries: mdE } = await getTree(SOURCE, mdPath);
          if (cancelled) return;
          setTreeMap((m) => ({ ...m, [mdPath]: mdE }));
          if (!mdE.some((e) => e.name === 'codex' && e.type === 'dir')) return;
        }
        const codexPath = `${selectedProject}/md/codex`;
        setExpanded((s) => new Set(s).add(codexPath));
        if (!treeMap[codexPath]) {
          const { entries: cxE } = await getTree(SOURCE, codexPath);
          if (cancelled) return;
          setTreeMap((m) => ({ ...m, [codexPath]: cxE }));
        }
      } catch {
        // 目录不存在或其他错误，静默略过；右栏会显示 0 活跃
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  // 加载选中文件
  useEffect(() => {
    if (!selectedPath) return;
    setFileLoading(true);
    setFileError(null);
    setFile(null);
    getFile(SOURCE, selectedPath)
      .then(setFile)
      .catch((err) => setFileError(err.message))
      .finally(() => setFileLoading(false));
  }, [selectedPath]);

  // 订阅文件变更：当前文件改/删提示 + 目录树命中祖先重拉
  // 用 ref 持有 treeMap 避免每次 setTreeMap 触发重新订阅
  const treeMapRef = useRef(treeMap);
  useEffect(() => { treeMapRef.current = treeMap; }, [treeMap]);

  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;

      // 1) 当前打开的文件被外部改/删
      if (selectedPath && evt.path === selectedPath) {
        if (evt.type === 'unlink') {
          setFile(null);
          setFileError('该文件已被外部删除或移走');
        } else {
          getFile(SOURCE, selectedPath)
            .then((f) => { setFile(f); setFileError(null); })
            .catch(() => {});
        }
        return;
      }

      // 2) 目录结构变化（add/unlink）→ 沿祖先链找最深命中的 treeMap key 重拉
      if (evt.type === 'add' || evt.type === 'unlink') {
        const segs = evt.path.split('/');
        const tm = treeMapRef.current;
        for (let i = segs.length - 1; i >= 0; i--) {
          const parent = i === 0 ? '' : segs.slice(0, i).join('/');
          if (parent in tm) {
            getTree(SOURCE, parent)
              .then(({ entries }) => setTreeMap((m) => ({ ...m, [parent]: entries })))
              .catch(() => {});
            break;
          }
        }
      }
    });
    return unsub;
  }, [selectedPath]);

  // URL 变化时同步 project + 展开父目录链
  useEffect(() => {
    if (!selectedPath) return;
    const proj = selectedPath.split('/')[0];
    if (proj && selectedProject !== proj) setSelectedProject(proj);
    const parts = selectedPath.split('/');
    const ancestors = [];
    for (let i = 0; i < parts.length - 1; i++) {
      ancestors.push(parts.slice(0, i + 1).join('/'));
    }
    setExpanded((s) => {
      const n = new Set(s);
      for (const a of ancestors) n.add(a);
      return n;
    });
    for (const a of ancestors) {
      if (!treeMap[a]) {
        getTree(SOURCE, a)
          .then(({ entries }) => setTreeMap((m) => ({ ...m, [a]: entries })))
          .catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPath]);

  const handleToggle = (path) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else {
        next.add(path);
        if (!treeMap[path]) {
          getTree(SOURCE, path)
            .then(({ entries }) => setTreeMap((m) => ({ ...m, [path]: entries })))
            .catch((err) => console.error('tree load failed', path, err));
        }
      }
      return next;
    });
  };

  const handleTrashed = (path) => {
    removeRecent(path);
    setRecentMods((items) => items?.filter((it) => !isSameOrChild(it.path, path)) ?? items);
    setActiveTasks((m) => Object.fromEntries(
      Object.entries(m).map(([project, items]) => [
        project,
        items.filter((it) => !isSameOrChild(it.path, path)),
      ]),
    ));
    setProjects((items) => items.filter((p) => !isSameOrChild(p.path || p.name, path)));
    if (selectedProject && isSameOrChild(selectedProject, path)) {
      setSelectedProject(null);
    }
    if (selectedPath && isSameOrChild(selectedPath, path)) {
      setSelectedPath(null);
      setFile(null);
      setFileError(null);
    }
    setExpanded((s) => {
      const next = new Set();
      for (const p of s) {
        if (!isSameOrChild(p, path)) next.add(p);
      }
      return next;
    });
    setTreeMap((m) => {
      const next = {};
      for (const [key, entries] of Object.entries(m)) {
        if (isSameOrChild(key, path)) continue;
        next[key] = key === parentOf(path)
          ? entries.filter((e) => !isSameOrChild(e.path, path))
          : entries;
      }
      return next;
    });
  };

  const isSelectedActive =
    selectedPath && activeTasks[projectOf(selectedPath)]?.some((f) => f.path === selectedPath);
  const badge = isSelectedActive ? (
    <span className="badge live" style={{ marginLeft: 8, fontSize: 10 }}>
      <span className="src-dot work" /> 活跃任务
    </span>
  ) : null;

  return (
    <Frame>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={(p) => {
            setSelectedProject(p);
            setSelectedPath(null);
            setFile(null);
          }}
          activeTasks={activeTasks}
          treeMap={treeMap}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={handleToggle}
          onSelectFile={setSelectedPath}
          onTrashed={handleTrashed}
        />
        {initError ? (
          <ErrorState msg={`无法加载项目列表：${initError}`} />
        ) : !selectedPath ? (
          <EmptyState hint="左栏选一个项目，点开 md/codex/current/ 下的任务文件" />
        ) : fileLoading ? (
          <LoadingState />
        ) : fileError ? (
          <ErrorState msg={`无法加载文件：${fileError}`} />
        ) : file ? (
          <MarkdownView path={selectedPath} file={file} badge={badge} onToc={setTocState} />
        ) : (
          <LoadingState />
        )}
        <SidePanel storageKey="work-right" defaultWidth={300}>
          <div className="kb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <CollapsibleSection
              storageKey="kb-section-work-toc"
              title="目录"
              icon="list"
              accent="var(--src-work)"
              badge={tocState.toc.length || null}
            >
              <TocList
                toc={tocState.toc}
                activeId={tocState.activeId}
                onJump={tocState.jumpTo}
                accentColor="var(--src-work)"
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-work-recent"
              title="最近打开"
              icon="clock"
              accent="var(--src-work)"
              badge={recent.length || null}
            >
              <RecentList
                recent={recent}
                currentPath={selectedPath}
                onSelect={setSelectedPath}
                accent="var(--src-work)"
                source="work"
                onTrashed={handleTrashed}
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-work-recent-mods"
              title="活跃修改"
              icon="clock"
              accent="var(--src-work)"
              badge={recentMods ? recentMods.length : null}
            >
              <RecentModsBody
                items={recentMods}
                selectedPath={selectedPath}
                onSelect={setSelectedPath}
              />
            </CollapsibleSection>
          </div>
        </SidePanel>
      </div>
    </Frame>
  );
}
