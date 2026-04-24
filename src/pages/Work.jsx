import React, { useEffect, useState } from 'react';
import { Frame, Icon, SourcePill } from '../components/primitives.jsx';
import { EmptyState, LoadingState, ErrorState, MarkdownView, TocList } from '../components/ReaderPanel.jsx';
import SidePanel from '../components/SidePanel.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import RecentList from '../components/RecentList.jsx';
import useRememberedPath from '../lib/useRememberedPath.js';
import useRecentFiles from '../lib/useRecentFiles.js';
import { getTree, getFile, subscribeFileEvents } from '../lib/api.js';

const SOURCE = 'work';
const MD_EXTS = new Set(['md', 'markdown']);

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
}) {
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();

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
      const isMd = e.type === 'file' && MD_EXTS.has(e.ext);
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
              cursor: isDir || isMd ? 'pointer' : 'default',
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
            onClick={() => (isDir ? onToggle(e.path) : isMd ? onSelectFile(e.path) : null)}
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
              style={{
                fontSize: 12,
                flex: 1,
                fontWeight: hot ? 600 : 400,
                opacity: !isDir && !isMd ? 0.5 : 1,
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
      style={{
        width: 240,
        background: 'var(--bg-tint)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
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
            >
              <Icon name="git" size={12} color={selected ? 'var(--src-work)' : 'var(--ink-muted)'} />
              <span className="kb-mono" style={{ fontSize: 12, flex: 1, fontWeight: selected ? 600 : 400 }}>{p.name}</span>
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
    </div>
  );
}

// ── 右栏：全部活跃任务 ──────────────────────────────────
function flattenActive(activeTasks) {
  const all = Object.entries(activeTasks).flatMap(([proj, list]) =>
    list.map((f) => ({ proj, ...f })),
  );
  all.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  return all;
}

function ActiveTasksBody({ activeTasks, selectedPath, onSelect }) {
  const all = flattenActive(activeTasks);
  if (all.length === 0) {
    return (
      <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>
        所有项目都没有 md/codex/current/ 目录
      </div>
    );
  }
  return (
    <div style={{ padding: '4px 12px 0' }}>
      {all.map((t) => {
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
            onClick={() => onSelect(t.path)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <span className="src-dot work" />
              <span className="kb-mono" style={{ fontSize: 10.5, color: 'var(--src-work)', fontWeight: 600 }}>
                {t.proj}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-muted)' }}>
                {new Date(t.mtime).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="kb-mono" style={{ fontSize: 11.5, color: 'var(--ink)' }}>{t.name}</div>
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
  const [recent] = useRecentFiles('kb-recent-work', selectedPath);
  const activeCount = Object.values(activeTasks).reduce((sum, list) => sum + list.length, 0);

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
              ? r.value.entries.filter((e) => e.type === 'file' && MD_EXTS.has(e.ext))
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

  // 订阅文件变更 → 当前文件有变则静默重拉
  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;
      if (selectedPath && evt.path === selectedPath && evt.type !== 'unlink') {
        getFile(SOURCE, selectedPath).then(setFile).catch(() => {});
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
        />
        {initError ? (
          <ErrorState msg={`无法加载项目列表：${initError}`} />
        ) : !selectedPath ? (
          <EmptyState hint="左栏选一个项目，点开 md/codex/current/ 下的任务 md" />
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
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-work-active"
              title="活跃任务"
              icon="flag"
              accent="var(--src-work)"
              badge={activeCount || null}
            >
              <ActiveTasksBody
                activeTasks={activeTasks}
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
