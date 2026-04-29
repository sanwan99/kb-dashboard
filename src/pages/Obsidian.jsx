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
import { getTree, getFile, getObsidianBacklinks, getObsidianTags, getObsidianNeighbors, subscribeFileEvents } from '../lib/api.js';

const SOURCE = 'obsidian';
const MD_EXTS = new Set(['md', 'markdown']);

// ── 侧栏 PARA 目录树（懒加载 + 展开/收起 + 本地过滤） ────────────────
function Sidebar({ treeMap, expanded, selectedPath, onToggle, onSelect, tags }) {
  const [filter, setFilter] = useState('');
  const ctx = useContextMenu();
  const q = filter.trim().toLowerCase();

  const renderLevel = (path, depth = 0) => {
    if (path !== '' && !expanded.has(path)) return null;
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
      const isExpanded = expanded.has(e.path);
      const active = selectedPath === e.path;
      return (
        <React.Fragment key={e.path}>
          <div
            className={`tree-row ${active ? 'active' : ''}`}
            style={{
              gap: 4,
              padding: `3px 6px 3px ${8 + depth * 14}px`,
              cursor: isDir || isMd ? 'pointer' : 'default',
            }}
            onClick={() => (isDir ? onToggle(e.path) : isMd ? onSelect(e.path) : null)}
            onContextMenu={(ev) => ctx.open(ev, buildFileMenuItems({ source: SOURCE, relPath: e.path, isDir }))}
          >
            {isDir ? (
              <Icon name={isExpanded ? 'chev-d' : 'chev-r'} size={10} color="var(--ink-muted)" />
            ) : (
              <span style={{ width: 10 }} />
            )}
            <Icon
              name={isDir ? (isExpanded ? 'folder-open' : 'folder') : 'file'}
              size={12}
              color={
                active
                  ? 'var(--src-obsidian)'
                  : isDir && isExpanded
                    ? 'var(--src-obsidian)'
                    : 'var(--ink-muted)'
              }
            />
            <span
              className="kb-mono"
              style={{
                fontSize: 12,
                flex: 1,
                opacity: !isDir && !isMd ? 0.5 : 1,
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
    <div style={{ width: 280, background: 'var(--bg-tint)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '12px 12px 8px' }}>
        <SourcePill source="obsidian" />
        <div className="kb-serif" style={{ fontSize: 14.5, fontWeight: 600, marginTop: 8 }}>个人知识库</div>
        <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>PARA · ~/Desktop/文档/个人知识库/</div>
      </div>

      <div style={{ padding: '6px 10px' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="过滤当前已展开的树…"
          style={{
            width: '100%',
            height: 26,
            fontSize: 11.5,
            padding: '0 8px',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--bg-raised)',
            color: 'var(--ink)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      <div className="kb-scroll" style={{ flex: 1, padding: '4px 6px 10px', fontSize: 12.5 }}>
        {renderLevel('')}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          标签 {tags ? `· ${tags.length}` : ''}
        </div>
        {tags == null ? (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>加载中…</div>
        ) : tags.length === 0 ? (
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            当前 vault 未使用 #tag（以 PARA 目录组织）
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {tags.slice(0, 12).map((t) => (
              <span
                key={t.tag}
                className="kb-mono"
                style={{
                  fontSize: 10.5,
                  color: 'var(--src-obsidian)',
                  background: 'var(--src-obsidian-bg)',
                  padding: '1px 6px',
                  borderRadius: 3,
                }}
                title={`${t.count} 文件`}
              >
                #{t.tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {ctx.Element}
    </div>
  );
}

// ── 局部图谱（径向布局 SVG）──────────────────────────────
function LocalGraph({ selectedPath, onNavigate, compact = false }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!selectedPath) { setData(null); return; }
    getObsidianNeighbors(selectedPath)
      .then(setData)
      .catch(() => setData({ neighbors: [] }));
  }, [selectedPath]);

  if (!selectedPath) {
    if (compact) return <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>选中一个笔记后显示图谱</div>;
    return null;
  }
  const neighbors = data?.neighbors || [];
  const W = 252, H = 140;
  const cx = W / 2, cy = H / 2;
  const r = 52;
  const centerName = selectedPath.split('/').pop().replace(/\.(md|markdown)$/i, '');

  const COLORS = {
    in: '#7A5AB8',
    out: '#3766B8',
    both: '#C15F3C',
  };

  const legend = (
    <span style={{ fontSize: 9.5, display: 'flex', gap: 6 }}>
      <span style={{ color: COLORS.in }}>● 入链</span>
      <span style={{ color: COLORS.out }}>● 出链</span>
    </span>
  );
  const svgBlock = (
    <div style={{ height: H + 8, background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {neighbors.length === 0 ? (
          <>
            <circle cx={cx} cy={cy} r="8" fill="var(--src-obsidian)" />
            <text x={cx} y={cy + 24} fontSize="10" textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)">无邻居</text>
          </>
        ) : (
          <>
            {neighbors.map((n, i) => {
              const angle = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
              const x = cx + r * Math.cos(angle);
              const y = cy + r * Math.sin(angle);
              const color = COLORS[n.direction];
              const name = n.path.split('/').pop().replace(/\.(md|markdown)$/i, '');
              return (
                <g key={n.path} style={{ cursor: 'pointer' }} onClick={() => onNavigate(n.path)}>
                  <line x1={cx} y1={cy} x2={x} y2={y} stroke={color} strokeWidth="1" strokeOpacity="0.4" />
                  <circle cx={x} cy={y} r="5" fill={color} opacity="0.85" />
                  <title>{name}</title>
                </g>
              );
            })}
            <circle cx={cx} cy={cy} r="8" fill="var(--src-obsidian)" stroke="var(--bg-raised)" strokeWidth="2" />
            <text x={cx} y={cy + 22} fontSize="10" textAnchor="middle" fill="var(--src-obsidian)" fontFamily="var(--font-mono)" fontWeight="600">
              {centerName.length > 12 ? centerName.slice(0, 11) + '…' : centerName}
            </text>
          </>
        )}
      </svg>
    </div>
  );
  const footer = (
    <div className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 4 }}>
      {neighbors.length} 个邻居 · 点击圆点跳转
    </div>
  );

  if (compact) {
    return (
      <div style={{ padding: '0 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>{legend}</div>
        {svgBlock}
        {footer}
      </div>
    );
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>局部图谱</span>
        <span style={{ marginLeft: 'auto' }}>{legend}</span>
      </div>
      {svgBlock}
      {footer}
    </div>
  );
}

// ── 反向链接 ───────────────────────────────────────────────
function useBacklinks(selectedPath) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!selectedPath) { setData(null); return; }
    setLoading(true);
    getObsidianBacklinks(selectedPath)
      .then(setData)
      .catch(() => setData({ backlinks: [] }))
      .finally(() => setLoading(false));
  }, [selectedPath]);
  return {
    data,
    loading,
    backlinks: data?.backlinks || [],
    stats: data?.stats,
  };
}

function BacklinksBody({ selectedPath, backlinks, loading, onNavigate }) {
  if (!selectedPath) {
    return <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>左栏选中文件后显示反链</div>;
  }
  if (loading) {
    return <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>加载中…</div>;
  }
  if (backlinks.length === 0) {
    return (
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', padding: '6px 14px', lineHeight: 1.55 }}>
        暂无反向链接
        <div style={{ fontSize: 10.5, marginTop: 4 }}>没有其他笔记通过 [[wikilink]] 指向当前文件</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '4px 12px 0' }}>
      {backlinks.map((b, i) => (
        <div
          key={i}
          className="kb-card"
          style={{ padding: 10, marginBottom: 8, borderRadius: 6, cursor: 'pointer' }}
          onClick={() => onNavigate(b.from)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="file" size={11} color="var(--src-obsidian)" />
            <span className="kb-mono" style={{ fontSize: 11.5, color: 'var(--ink)', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {b.from.split('/').pop()}
            </span>
            <span className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>L{b.line}</span>
          </div>
          <div className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>
            {b.from.split('/').slice(0, -1).join('/') || '/'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-sub)', lineHeight: 1.5, marginTop: 6 }}>{b.preview}</div>
        </div>
      ))}
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export default function Obsidian() {
  const [treeMap, setTreeMap] = useState({});         // path -> entries[]
  const [expanded, setExpanded] = useState(new Set()); // 非根展开的目录 path 集合
  const [selectedPath, setSelectedPath] = useRememberedPath('kb-last-path-obsidian');
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [rootError, setRootError] = useState(null);
  const [tags, setTags] = useState(null);
  const [tocState, setTocState] = useState({ toc: [], activeId: null, jumpTo: () => {} });
  const [recent] = useRecentFiles('kb-recent-obsidian', selectedPath);
  const { backlinks, loading: blLoading, stats: blStats } = useBacklinks(selectedPath);

  // 初始化加载根
  useEffect(() => {
    getTree(SOURCE, '')
      .then(({ entries }) => setTreeMap((m) => ({ ...m, '': entries })))
      .catch((err) => setRootError(err.message));
    getObsidianTags()
      .then((d) => setTags(d.tags || []))
      .catch(() => setTags([]));
  }, []);

  // URL 变化时展开父目录链（URL 已是 selectedPath 的唯一真相）
  useEffect(() => {
    if (!selectedPath) return;
    const parts = selectedPath.split('/');
    const ancestors = [];
    for (let i = 0; i < parts.length - 1; i++) {
      ancestors.push(parts.slice(0, i + 1).join('/'));
    }
    setExpanded((s) => {
      const next = new Set(s);
      for (const a of ancestors) next.add(a);
      return next;
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
  const treeMapRef = useRef(treeMap);
  useEffect(() => { treeMapRef.current = treeMap; }, [treeMap]);

  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;

      // 1) 当前打开文件被外部改/删
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

      // 2) 目录结构变化（add/unlink）→ 沿祖先找最深命中的 treeMap key 重拉
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

  const handleToggle = (path) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(path)) {
        next.delete(path);
      } else {
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

  return (
    <Frame>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          treeMap={treeMap}
          expanded={expanded}
          selectedPath={selectedPath}
          onToggle={handleToggle}
          onSelect={setSelectedPath}
          tags={tags}
        />
        {rootError ? (
          <ErrorState msg={`无法加载目录：${rootError}`} />
        ) : !selectedPath ? (
          <EmptyState />
        ) : fileLoading ? (
          <LoadingState />
        ) : fileError ? (
          <ErrorState msg={`无法加载文件：${fileError}`} />
        ) : file ? (
          <MarkdownView path={selectedPath} file={file} onToc={setTocState} />
        ) : (
          <LoadingState />
        )}
        <SidePanel storageKey="obsidian-right" defaultWidth={300}>
          <div className="kb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <CollapsibleSection
              storageKey="kb-section-obsidian-toc"
              title="目录"
              icon="list"
              accent="var(--src-obsidian)"
              badge={tocState.toc.length || null}
            >
              <TocList
                toc={tocState.toc}
                activeId={tocState.activeId}
                onJump={tocState.jumpTo}
                accentColor="var(--src-obsidian)"
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-obsidian-recent"
              title="最近打开"
              icon="clock"
              accent="var(--src-obsidian)"
              badge={recent.length || null}
            >
              <RecentList
                recent={recent}
                currentPath={selectedPath}
                onSelect={setSelectedPath}
                accent="var(--src-obsidian)"
                source="obsidian"
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-obsidian-backlinks"
              title="反向链接"
              icon="link"
              accent="var(--src-obsidian)"
              badge={selectedPath ? backlinks.length : null}
            >
              <BacklinksBody
                selectedPath={selectedPath}
                backlinks={backlinks}
                loading={blLoading}
                onNavigate={setSelectedPath}
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-obsidian-graph"
              title="局部图谱"
              icon="graph"
              accent="var(--src-obsidian)"
              defaultOpen={false}
            >
              <LocalGraph selectedPath={selectedPath} onNavigate={setSelectedPath} compact />
            </CollapsibleSection>
            {blStats && (
              <div className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)', padding: '10px 14px', lineHeight: 1.55 }}>
                {blStats.fileCount} 文件 · {blStats.backlinkTargets} 被引目标
              </div>
            )}
          </div>
        </SidePanel>
      </div>
    </Frame>
  );
}
