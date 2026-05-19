import React, { useEffect, useRef, useState } from 'react';
import { Frame, Icon } from '../components/primitives.jsx';
import { EmptyState, LoadingState, ErrorState, MarkdownView, TocList } from '../components/ReaderPanel.jsx';
import SidePanel from '../components/SidePanel.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import RecentList from '../components/RecentList.jsx';
import useRememberedPath from '../lib/useRememberedPath.js';
import useRecentFiles from '../lib/useRecentFiles.js';
import { useContextMenu } from '../lib/useContextMenu.jsx';
import { buildFileMenuItems } from '../lib/fileActions.js';
import {
  getTree, getFile, subscribeFileEvents,
  listCustomSources, addCustomSource, renameCustomSource, removeCustomSource,
  pickDirectory,
} from '../lib/api.js';
import { READABLE_EXTS } from '../lib/fileTypes.js';

const SOURCE = 'custom';
const ACCENT = '#4A8B5E';
const ACCENT_BG = 'rgba(74,139,94,0.12)';

const isSameOrChild = (p, target) => p === target || p.startsWith(target + '/');
const parentOf = (p) => {
  const parts = p.split('/');
  parts.pop();
  return parts.join('/');
};

// 解析 selectedPath 中的 mountId（path 的第一段）
function mountIdOf(p) {
  if (!p) return null;
  const i = p.indexOf('/');
  return i === -1 ? p : p.slice(0, i);
}

function MountManagerHeader({ onAdd }) {
  return (
    <div style={{ padding: '12px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        className="src-pill"
        style={{ background: ACCENT_BG, color: ACCENT, borderColor: 'rgba(74,139,94,0.3)' }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT, display: 'inline-block' }} />
        自定义来源
      </span>
      <button
        type="button"
        className="kb-btn ghost"
        onClick={onAdd}
        title="添加目录"
        style={{ marginLeft: 'auto', height: 24, padding: '0 8px', fontSize: 12, color: ACCENT }}
      >
        <Icon name="folder-open" size={12} color={ACCENT} /> 添加
      </button>
    </div>
  );
}

function MountRow({ mount, selected, onSelect, onRename, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mount.name);
  useEffect(() => { setDraft(mount.name); }, [mount.name]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== mount.name) onRename(mount.id, v);
    setEditing(false);
  };
  const cancel = () => { setDraft(mount.name); setEditing(false); };

  return (
    <div
      className={`tree-row ${selected ? 'active-custom' : ''}`}
      style={{
        gap: 6,
        padding: '6px 8px',
        cursor: mount.available ? 'pointer' : 'default',
        opacity: mount.available ? 1 : 0.55,
      }}
      onClick={() => !editing && mount.available && onSelect(mount.id)}
    >
      <Icon name="folder" size={12} color={selected ? ACCENT : 'var(--ink-muted)'} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          onClick={(e) => e.stopPropagation()}
          className="kb-mono"
          style={{
            flex: 1,
            fontSize: 12,
            padding: '0 4px',
            border: '1px solid var(--border)',
            borderRadius: 4,
            background: 'var(--bg-raised)',
            color: 'var(--ink)',
            outline: 'none',
            minWidth: 0,
          }}
        />
      ) : (
        <span
          className="kb-mono"
          style={{
            fontSize: 12,
            flex: 1,
            fontWeight: selected ? 600 : 400,
            color: selected ? ACCENT : 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={mount.realRoot}
        >
          {mount.name}
          {!mount.available && <span style={{ color: 'var(--danger)', fontSize: 10, marginLeft: 4 }}>· 不可用</span>}
        </span>
      )}
      <button
        type="button"
        className="kb-btn ghost"
        title="重命名"
        onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        style={{ height: 18, padding: '0 4px', fontSize: 10 }}
      >
        改
      </button>
      <button
        type="button"
        className="kb-btn ghost"
        title="移除挂载（不会删除目录本身）"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`从看板移除 "${mount.name}" 吗？\n（不会删除目录本身：${mount.realRoot}）`)) {
            onRemove(mount.id);
          }
        }}
        style={{ height: 18, padding: '0 4px', fontSize: 10, color: 'var(--danger)' }}
      >
        删
      </button>
    </div>
  );
}

function FileTree({ mountId, treeMap, expanded, selectedPath, onToggle, onSelectFile, onTrashed }) {
  const ctx = useContextMenu();

  const renderLevel = (path, depth = 0) => {
    if (path !== mountId && !expanded.has(path)) return null;
    const entries = treeMap[path];
    if (!entries) {
      return (
        <div style={{ padding: `3px 6px 3px ${10 + depth * 14}px`, fontSize: 11, color: 'var(--ink-muted)' }}>
          加载中…
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <div style={{ padding: `3px 6px 3px ${10 + depth * 14}px`, fontSize: 11, color: 'var(--ink-muted)' }}>
          （空目录）
        </div>
      );
    }
    return entries.map((e) => {
      const isDir = e.type === 'dir';
      const isReadable = e.type === 'file' && READABLE_EXTS.has(e.ext);
      const isExp = expanded.has(e.path);
      const active = selectedPath === e.path;
      return (
        <React.Fragment key={e.path}>
          <div
            className={`tree-row ${active ? 'active-custom' : ''}`}
            style={{
              gap: 4,
              padding: `3px 6px 3px ${8 + depth * 14}px`,
              cursor: isDir || isReadable ? 'pointer' : 'default',
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
              name={isDir ? (isExp ? 'folder-open' : 'folder') : 'file'}
              size={12}
              color={active ? ACCENT : isDir && isExp ? ACCENT : 'var(--ink-muted)'}
            />
            <span
              className="kb-mono"
              style={{
                fontSize: 12,
                flex: 1,
                fontWeight: active ? 600 : 400,
                color: active ? ACCENT : 'var(--ink-sub)',
                opacity: !isDir && !isReadable ? 0.5 : 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {e.name}
            </span>
          </div>
          {isDir && renderLevel(e.path, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="kb-scroll" style={{ flex: 1, padding: '4px 6px 10px', fontSize: 11.5, minHeight: 0, overflowY: 'auto' }}>
      {renderLevel(mountId, 0)}
      {ctx.Element}
    </div>
  );
}

export default function Custom() {
  const [mounts, setMounts] = useState(null); // null = 加载中
  const [selectedMount, setSelectedMount] = useState(null);
  const [treeMap, setTreeMap] = useState({});
  const [expanded, setExpanded] = useState(new Set());
  const [selectedPath, setSelectedPath] = useRememberedPath('kb-last-path-custom');
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [initError, setInitError] = useState(null);
  const [tocState, setTocState] = useState({ toc: [], activeId: null, jumpTo: () => {} });
  const [recent, , removeRecent] = useRecentFiles('kb-recent-custom', selectedPath);

  // 拉挂载列表
  const refreshMounts = () =>
    listCustomSources()
      .then((items) => {
        setMounts(items);
        return items;
      })
      .catch((err) => {
        setInitError(err.message);
        return [];
      });

  useEffect(() => {
    refreshMounts().then((items) => {
      // 没有选中过 → 默认选第一个可用
      if (selectedMount) return;
      const fromUrl = mountIdOf(selectedPath);
      if (fromUrl && items.some((m) => m.id === fromUrl)) {
        setSelectedMount(fromUrl);
      } else {
        const first = items.find((m) => m.available);
        if (first) setSelectedMount(first.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 选中挂载点变化 → 拉它的根目录
  useEffect(() => {
    if (!selectedMount) return;
    if (treeMap[selectedMount]) return;
    let cancelled = false;
    getTree(SOURCE, selectedMount)
      .then(({ entries }) => {
        if (cancelled) return;
        setTreeMap((m) => ({ ...m, [selectedMount]: entries }));
      })
      .catch((err) => {
        if (!cancelled) setInitError(err.message);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMount]);

  // 加载选中文件
  useEffect(() => {
    if (!selectedPath) { setFile(null); return; }
    setFileLoading(true);
    setFileError(null);
    setFile(null);
    getFile(SOURCE, selectedPath)
      .then(setFile)
      .catch((err) => setFileError(err.message))
      .finally(() => setFileLoading(false));
  }, [selectedPath]);

  // URL 同步：path 带挂载 → 同步选中 + 展开父目录链
  useEffect(() => {
    if (!selectedPath) return;
    const mid = mountIdOf(selectedPath);
    if (mid && selectedMount !== mid) setSelectedMount(mid);
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

  // SSE：custom 源文件变更 → 当前文件刷新 + 目录树命中重拉
  const treeMapRef = useRef(treeMap);
  useEffect(() => { treeMapRef.current = treeMap; }, [treeMap]);
  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      // reindex：search 索引重建完成（5s 防抖后），readableDirsCache 已失效。
      // 重拉所有已展开 tree，让"新建空目录 + 立即放可读文件"这种 corner case 也能显示出新目录。
      if (evt.type === 'reindex') {
        const tm = treeMapRef.current;
        for (const p of Object.keys(tm)) {
          getTree(SOURCE, p)
            .then(({ entries }) => setTreeMap((m) => ({ ...m, [p]: entries })))
            .catch(() => {});
        }
        return;
      }
      if (evt.source !== SOURCE) return;
      if (selectedPath && evt.path === selectedPath) {
        if (evt.type === 'unlink') {
          setFile(null);
          setFileError('该文件已被外部删除或移走');
        } else {
          getFile(SOURCE, selectedPath).then((f) => { setFile(f); setFileError(null); }).catch(() => {});
        }
        return;
      }
      if (evt.type === 'add' || evt.type === 'unlink') {
        const segs = evt.path.split('/');
        const tm = treeMapRef.current;
        for (let i = segs.length - 1; i >= 0; i--) {
          const parent = segs.slice(0, i).join('/');
          if (parent && parent in tm) {
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

  const handleAdd = async () => {
    const r = await pickDirectory({ title: '引入一个目录' });
    if (r.canceled) return;
    try {
      const m = await addCustomSource({ path: r.path });
      const items = await refreshMounts();
      // 如果还没选中，选中刚加的
      if (m?.id) {
        setSelectedMount(m.id);
        // 清掉旧 path（避免遗留到不存在的挂载）
        if (!selectedPath || !items.some((x) => mountIdOf(selectedPath) === x.id)) {
          setSelectedPath(null);
        }
      }
    } catch (err) {
      alert(`添加失败：${err.message}`);
    }
  };

  const handleRename = async (id, name) => {
    try {
      await renameCustomSource(id, name);
      await refreshMounts();
    } catch (err) {
      alert(`重命名失败：${err.message}`);
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeCustomSource(id);
      const items = await refreshMounts();
      if (selectedMount === id) {
        setSelectedMount(items.find((m) => m.available)?.id || null);
        setSelectedPath(null);
      }
      // 清缓存树
      setTreeMap((m) => {
        const n = { ...m };
        for (const k of Object.keys(n)) {
          if (k === id || k.startsWith(id + '/')) delete n[k];
        }
        return n;
      });
    } catch (err) {
      alert(`移除失败：${err.message}`);
    }
  };

  const handleTrashed = (path) => {
    removeRecent(path);
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

  return (
    <Frame>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* 左栏：挂载列表 + 当前挂载文件树 */}
        <div
          style={{
            width: 260,
            background: 'var(--bg-tint)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <MountManagerHeader onAdd={handleAdd} />
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '4px 14px 2px',
            }}
          >
            已引入目录{mounts ? ` (${mounts.length})` : ''}
          </div>
          <div style={{ padding: '0 6px 6px' }}>
            {mounts === null && (
              <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--ink-muted)' }}>加载中…</div>
            )}
            {mounts && mounts.length === 0 && (
              <div style={{ padding: '8px 10px', fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                还没有引入任何目录。
                <br />
                点上方"添加"挑选一个本地目录。
              </div>
            )}
            {mounts?.map((m) => (
              <MountRow
                key={m.id}
                mount={m}
                selected={selectedMount === m.id}
                onSelect={(id) => {
                  setSelectedMount(id);
                  setSelectedPath(null);
                  setFile(null);
                }}
                onRename={handleRename}
                onRemove={handleRemove}
              />
            ))}
          </div>
          {selectedMount && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '8px 14px 4px',
                  borderTop: '1px solid var(--border)',
                }}
              >
                目录
              </div>
              <FileTree
                mountId={selectedMount}
                treeMap={treeMap}
                expanded={expanded}
                selectedPath={selectedPath}
                onToggle={handleToggle}
                onSelectFile={setSelectedPath}
                onTrashed={handleTrashed}
              />
            </>
          )}
        </div>

        {/* 中间：阅读器 */}
        {initError ? (
          <ErrorState msg={`加载失败：${initError}`} />
        ) : mounts && mounts.length === 0 ? (
          <EmptyState hint="左上方点 “添加” 引入一个本地目录，看板里就能浏览/搜索它的 md 了" />
        ) : !selectedMount ? (
          <EmptyState hint="左栏选一个已引入的目录" />
        ) : !selectedPath ? (
          <EmptyState hint="左栏选一个可读文件" />
        ) : fileLoading ? (
          <LoadingState />
        ) : fileError ? (
          <ErrorState msg={`无法加载文件：${fileError}`} />
        ) : file ? (
          <MarkdownView path={selectedPath} file={file} onToc={setTocState} />
        ) : (
          <LoadingState />
        )}

        {/* 右栏：TOC + 最近 */}
        <SidePanel storageKey="custom-right" defaultWidth={280}>
          <div className="kb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <CollapsibleSection
              storageKey="kb-section-custom-toc"
              title="目录"
              icon="list"
              accent={ACCENT}
              badge={tocState.toc.length || null}
            >
              <TocList
                toc={tocState.toc}
                activeId={tocState.activeId}
                onJump={tocState.jumpTo}
                accentColor={ACCENT}
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-custom-recent"
              title="最近打开"
              icon="clock"
              accent={ACCENT}
              badge={recent.length || null}
            >
              <RecentList
                recent={recent}
                currentPath={selectedPath}
                onSelect={setSelectedPath}
                accent={ACCENT}
                source="custom"
                onTrashed={handleTrashed}
              />
            </CollapsibleSection>
          </div>
        </SidePanel>
      </div>
    </Frame>
  );
}
