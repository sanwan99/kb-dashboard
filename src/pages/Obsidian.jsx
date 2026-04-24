import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Frame, Icon, SourcePill } from '../components/primitives.jsx';
import { EmptyState, LoadingState, ErrorState, MarkdownView } from '../components/ReaderPanel.jsx';
import { getTree, getFile, getObsidianBacklinks, getObsidianTags, getObsidianNeighbors, subscribeFileEvents } from '../lib/api.js';

const SOURCE = 'obsidian';
const MD_EXTS = new Set(['md', 'markdown']);

// ── 侧栏 PARA 目录树（懒加载 + 展开/收起 + 本地过滤） ────────────────
function Sidebar({ treeMap, expanded, selectedPath, onToggle, onSelect, tags }) {
  const [filter, setFilter] = useState('');
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
    </div>
  );
}

// ── 局部图谱（径向布局 SVG）──────────────────────────────
function LocalGraph({ selectedPath, onNavigate }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!selectedPath) { setData(null); return; }
    getObsidianNeighbors(selectedPath)
      .then(setData)
      .catch(() => setData({ neighbors: [] }));
  }, [selectedPath]);

  if (!selectedPath) return null;
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

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span>局部图谱</span>
        <span style={{ marginLeft: 'auto', fontSize: 9.5, display: 'flex', gap: 6 }}>
          <span style={{ color: COLORS.in }}>● 入链</span>
          <span style={{ color: COLORS.out }}>● 出链</span>
        </span>
      </div>
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
      <div className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 4 }}>
        {neighbors.length} 个邻居 · 点击圆点跳转
      </div>
    </div>
  );
}

// ── 右栏：反向链接 ───────────────────────────────────────
function BacklinksPanel({ selectedPath, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPath) {
      setData(null);
      return;
    }
    setLoading(true);
    getObsidianBacklinks(selectedPath)
      .then(setData)
      .catch(() => setData({ backlinks: [] }))
      .finally(() => setLoading(false));
  }, [selectedPath]);

  const backlinks = data?.backlinks || [];

  return (
    <div style={{ width: 280, background: 'var(--bg-tint)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Icon name="link" size={13} color="var(--src-obsidian)" />
          <b style={{ fontSize: 13 }}>反向链接</b>
          <span
            className="badge"
            style={{ marginLeft: 'auto', background: 'var(--src-obsidian-bg)', color: 'var(--src-obsidian)', borderColor: '#DFD5F0' }}
          >
            {selectedPath ? backlinks.length : '—'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>谁引用了这篇笔记（[[wikilink]]）</div>
      </div>

      <div className="kb-scroll" style={{ flex: 1, padding: '10px 12px' }}>
        {!selectedPath && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: 8 }}>左栏选中文件后显示反链</div>
        )}
        {selectedPath && loading && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: 8 }}>加载中…</div>
        )}
        {selectedPath && !loading && backlinks.length === 0 && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', padding: 8, lineHeight: 1.55 }}>
            暂无反向链接
            <div style={{ fontSize: 10.5, marginTop: 4 }}>没有其他笔记通过 [[wikilink]] 指向当前文件</div>
          </div>
        )}
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

      <LocalGraph selectedPath={selectedPath} onNavigate={onNavigate} />
      <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
        <div className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
          {data?.stats ? `${data.stats.fileCount} 文件 · ${data.stats.backlinkTargets} 被引目标` : '…'}
        </div>
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export default function Obsidian() {
  const [treeMap, setTreeMap] = useState({});         // path -> entries[]
  const [expanded, setExpanded] = useState(new Set()); // 非根展开的目录 path 集合
  const [sp, setSp] = useSearchParams();
  const selectedPath = sp.get('path') || null;
  const setSelectedPath = (p) => setSp(p ? { path: p } : {});
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [rootError, setRootError] = useState(null);
  const [tags, setTags] = useState(null);

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

  // 订阅文件变更 → 当前文件有变则静默重拉；其他变化等 tree 重新加载时处理
  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;
      if (selectedPath && evt.path === selectedPath && evt.type !== 'unlink') {
        getFile(SOURCE, selectedPath).then(setFile).catch(() => {});
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
          <MarkdownView path={selectedPath} file={file} />
        ) : (
          <LoadingState />
        )}
        <BacklinksPanel selectedPath={selectedPath} onNavigate={setSelectedPath} />
      </div>
    </Frame>
  );
}
