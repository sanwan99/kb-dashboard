import React, { useEffect, useMemo, useState } from 'react';
import useRememberedPath from '../lib/useRememberedPath.js';
import useRecentFiles from '../lib/useRecentFiles.js';
import { Frame, Icon, SourcePill } from '../components/primitives.jsx';
import { EmptyState, LoadingState, ErrorState, MarkdownView, TocList } from '../components/ReaderPanel.jsx';
import SidePanel from '../components/SidePanel.jsx';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import RecentList from '../components/RecentList.jsx';
import { useContextMenu } from '../lib/useContextMenu.jsx';
import { buildFileMenuItems } from '../lib/fileActions.js';
import { getTree, getFile, getLearnProgress, subscribeFileEvents } from '../lib/api.js';
import { usePrefs } from '../lib/usePrefs.js';
import { READABLE_EXTS, MARKDOWN_EXTS } from '../lib/fileTypes.js';

const SOURCE = 'learn';

const isSameOrChild = (p, target) => p === target || p.startsWith(target + '/');

const STATUS_STYLE = {
  done: { fill: '100%', color: 'var(--src-learn)' },
  'in-progress': { fill: '55%', color: 'var(--src-learn)' },
  pending: { fill: '0%', color: 'var(--src-learn)' },
  optional: { fill: '0%', color: 'var(--src-learn)' },
};

// ── 健康指示：徽标 + 降级横幅 ───────────────────────────────
function formatRelTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return '刚刚';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} 分钟前`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)} 小时前`;
  return `${Math.round(diffSec / 86400)} 天前`;
}

function describeHealth(progress) {
  if (!progress) return null;
  const { health = 'ok', source = 'structured', cachedAt } = progress;
  if (health === 'ok' && source === 'structured') {
    return { tone: 'ok', label: '结构化', desc: 'kb-progress 协议块解析正常' };
  }
  if (source === 'markdown_fallback') {
    return {
      tone: 'warn',
      label: '降级解析',
      desc: 'progress.md 顶部缺少 kb-progress 围栏块，已退到旧正则解析；建议补回结构化块。',
    };
  }
  if (source === 'cache_fallback') {
    return {
      tone: 'error',
      label: cachedAt ? `缓存兜底 · ${formatRelTime(cachedAt)}` : '缓存兜底',
      desc: '当前 progress.md 解析失败，正在显示上次成功的状态。请检查文件顶部的 kb-progress 块。',
    };
  }
  if (source === 'unavailable') {
    return {
      tone: 'error',
      label: '不可用',
      desc: 'progress.md 解析失败且无可用缓存。请打开 progress.md，在文件顶部补回 kb-progress 围栏块。',
    };
  }
  // structured + warn
  if (health === 'warn') {
    return {
      tone: 'warn',
      label: '结构化（有警告）',
      desc: '结构化块已成功解析，但部分字段不规范，详情见下方 warnings。',
    };
  }
  return { tone: 'ok', label: '结构化', desc: '' };
}

const TONE_STYLE = {
  ok: { color: 'var(--ok)', bg: '#E8F1EB', border: '#CFE3D6' },
  warn: { color: 'var(--warn)', bg: '#F6ECD6', border: '#E6D4A8' },
  error: { color: 'var(--danger)', bg: '#FAE2DB', border: '#E8C4B8' },
};

function HealthBadge({ progress, onClick }) {
  const info = describeHealth(progress);
  if (!info) return null;
  const s = TONE_STYLE[info.tone];
  return (
    <span
      className="badge"
      title={`${info.desc || info.label}（点击打开 progress.md）`}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      style={{
        background: s.bg, color: s.color, borderColor: s.border,
        fontSize: 10.5, cursor: 'pointer',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 3, background: s.color }} />
      {info.label}
    </span>
  );
}

function HealthBanner({ progress, onOpenProgressMd }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!progress) return null;
  const info = describeHealth(progress);
  if (!info || info.tone === 'ok') return null;
  const s = TONE_STYLE[info.tone];
  const warnings = progress.warnings || [];
  return (
    <div
      style={{
        margin: '8px 32px 4px',
        padding: '10px 14px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 6,
        fontSize: 12.5,
        color: 'var(--ink)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="flag" size={14} color={s.color} />
        <b style={{ color: s.color }}>progress.md 解析降级 · {info.label}</b>
        <span style={{ flex: 1, color: 'var(--ink-sub)' }}>{info.desc}</span>
        <button
          className="kb-btn ghost"
          style={{ height: 22, padding: '0 8px', fontSize: 11 }}
          onClick={onOpenProgressMd}
        >
          打开 progress.md
        </button>
        {warnings.length > 0 && (
          <button
            className="kb-btn ghost"
            style={{ height: 22, padding: '0 8px', fontSize: 11 }}
            onClick={() => setShowDetail((v) => !v)}
          >
            {showDetail ? '收起' : `详情 (${warnings.length})`}
          </button>
        )}
      </div>
      {showDetail && warnings.length > 0 && (
        <ul style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-sub)' }}>
          {warnings.map((w, i) => (
            <li key={i}>
              <span
                className="kb-mono"
                style={{
                  fontSize: 10.5,
                  padding: '0 4px',
                  marginRight: 6,
                  borderRadius: 3,
                  background: w.level === 'error' ? '#FAE2DB' : '#F6ECD6',
                  color: w.level === 'error' ? 'var(--danger)' : 'var(--warn)',
                }}
              >
                {w.level}
              </span>
              <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                {w.code}
              </span>
              {w.at && (
                <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginLeft: 6 }}>
                  @ {w.at}
                </span>
              )}
              <span style={{ marginLeft: 6 }}>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── 折叠条（顶部单行 summary，点击展开/收起）────────────────
function CollapsibleProgressHeader({ progress, open, onToggle, onOpenProgressMd }) {
  if (!progress) {
    return (
      <div style={{ padding: '10px 32px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--ink-muted)' }}>
        progress.md 加载中…
      </div>
    );
  }
  const summary = progress.currentStageText || '未识别当前阶段';

  return (
    <div style={{ borderBottom: open ? 0 : '1px solid var(--border)', background: 'var(--bg)' }}>
      <button
        type="button"
        onClick={onToggle}
        title={open ? '点击收起' : '点击展开阶段进度与断点'}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '9px 32px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <Icon name={open ? 'chev-d' : 'chev-r'} size={12} color="var(--ink-muted)" />
        <span
          className="badge live"
          style={{ background: 'var(--src-learn-bg)', color: 'var(--src-learn)', borderColor: '#D8E3F5', fontSize: 11 }}
        >
          <span className="src-dot learn" /> 阶段 {progress.currentIndex ?? '?'}/{progress.totalStages}
        </span>
        <span className="kb-mono" style={{ fontSize: 11, color: 'var(--src-learn)' }}>
          {progress.progressPct}%
        </span>
        <HealthBadge progress={progress} onClick={onOpenProgressMd} />
        <span
          style={{
            fontSize: 12.5,
            color: 'var(--ink)',
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {summary}
        </span>
        <span className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
          {open ? '收起' : '展开'}
        </span>
      </button>

      {open && (
        <>
          <StageBar progress={progress} onOpenProgressMd={onOpenProgressMd} />
          <BreakpointCard progress={progress} onOpenProgressMd={onOpenProgressMd} />
        </>
      )}
    </div>
  );
}

// ── 顶部：五阶段进度条 ──────────────────────────────────
function StageBar({ progress, onOpenProgressMd }) {
  if (!progress) {
    return (
      <div style={{ padding: '18px 32px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>progress.md 加载中…</div>
      </div>
    );
  }
  return (
    <div style={{ padding: '18px 32px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {progress.totalStages} 阶段学习路径
        </span>
        <button
          className="kb-btn ghost"
          style={{ height: 22, padding: '0 8px', fontSize: 11, color: 'var(--ink-muted)' }}
          onClick={onOpenProgressMd}
          title="在主区打开 progress.md 全文"
        >
          <Icon name="file" size={11} /> progress.md
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-sub)' }}>
          已完成 <b style={{ color: 'var(--src-learn)' }}>{progress.doneStages}/{progress.totalStages}</b>
          <span style={{ marginLeft: 6, color: 'var(--ink-muted)' }}>· {progress.progressPct}%</span>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {progress.stages.map((s) => {
          const st = STATUS_STYLE[s.status];
          return (
            <div key={s.index} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-sunk)', overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: st.fill, background: st.color }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                  {String(s.index).padStart(2, '0')}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color:
                      s.status === 'in-progress'
                        ? 'var(--ink)'
                        : s.status === 'done'
                          ? 'var(--ink-sub)'
                          : 'var(--ink-muted)',
                    fontWeight: s.status === 'in-progress' ? 600 : 400,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={s.name}
                >
                  {s.name}
                </span>
                {s.status === 'done' && <Icon name="check" size={11} color="var(--ok)" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 断点卡 ───────────────────────────────────────────────
function BreakpointCard({ progress, onOpenProgressMd }) {
  if (!progress) return null;
  const summary = useMemo(() => {
    if (!progress.breakpointHtml) return '';
    // 抽第一个 <p> 后的内容作为摘要（去掉 HTML 标签）
    const paras = [...progress.breakpointHtml.matchAll(/<p>([\s\S]+?)<\/p>/g)];
    const texts = paras.slice(0, 2).map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    const joined = texts.join(' · ');
    return joined.length > 160 ? joined.slice(0, 160) + '…' : joined;
  }, [progress.breakpointHtml]);

  const mtime = new Date(progress.mtime).toLocaleString('zh-CN', { hour12: false });

  return (
    <div style={{ padding: '22px 32px 8px' }}>
      <div
        className="kb-card"
        style={{
          padding: 20,
          background: 'linear-gradient(135deg, var(--bg-raised) 0%, var(--src-learn-bg) 140%)',
          borderColor: '#D8E3F5',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span className="badge live" style={{ background: 'var(--src-learn-bg)', color: 'var(--src-learn)', borderColor: '#D8E3F5' }}>
            <span className="src-dot learn" /> 当前断点
          </span>
          <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
            progress.md · {mtime}
          </span>
        </div>
        <h2 className="kb-serif" style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>
          {progress.currentStageText || '未识别当前阶段'}
        </h2>
        {summary && (
          <div style={{ fontSize: 13.5, color: 'var(--ink-sub)', lineHeight: 1.6, marginBottom: 14, maxWidth: 720 }}>
            {summary}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="kb-btn primary" style={{ height: 32 }} onClick={onOpenProgressMd}>
            <Icon name="play" size={13} /> 查看 progress.md 全文
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 左栏 Sidebar ─────────────────────────────────────────
function Sidebar({
  mode,
  onModeChange,
  knowledgeFiles,
  reviewTopics,
  selectedTopic,
  onSelectTopic,
  topicFiles,
  selectedPath,
  onSelectFile,
  onTrashed,
}) {
  const [filter, setFilter] = useState('');
  const ctx = useContextMenu();
  const q = filter.trim().toLowerCase();
  const keep = (name) => !q || name.toLowerCase().includes(q);

  const renderFile = (e, indent = 0) => {
    const active = selectedPath === e.path;
    const sizeKb = e.size ? (e.size / 1024).toFixed(1) + 'k' : '';
    return (
      <div
        key={e.path}
        className={`tree-row ${active ? 'active-learn' : ''}`}
        style={{ padding: `3px 6px 3px ${6 + indent}px`, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
        onClick={() => onSelectFile(e.path)}
        onContextMenu={(ev) => ctx.open(ev, buildFileMenuItems({ source: SOURCE, relPath: e.path, isDir: false, onTrashed }))}
      >
        <Icon name="file" size={11} color={active ? 'var(--src-learn)' : 'var(--ink-muted)'} />
        <span style={{ flex: 1, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {e.name}
        </span>
        <span style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{sizeKb}</span>
      </div>
    );
  };

  const topicSystem = topicFiles?.filter((e) => e.type === 'file' && MARKDOWN_EXTS.has(e.ext) && e.name.startsWith('_')) || [];
  const topicChapters =
    topicFiles?.filter((e) => e.type === 'file' && READABLE_EXTS.has(e.ext) && !e.name.startsWith('_')) || [];

  return (
    <div style={{ width: 260, background: 'var(--bg-tint)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '14px 14px 8px' }}>
        <SourcePill source="learn" />
        <div className="kb-serif" style={{ fontSize: 15, fontWeight: 600, marginTop: 8 }}>AI Agent 学习项目</div>
        <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>~/个人学习项目/</div>
      </div>
      <div style={{ display: 'flex', gap: 2, padding: '0 10px', marginBottom: 6 }}>
        {['knowledge', 'review'].map((t) => {
          const on = mode === t;
          return (
            <button
              key={t}
              className="kb-btn ghost"
              style={{
                flex: 1,
                height: 26,
                fontSize: 12,
                background: on ? 'var(--bg-raised)' : 'transparent',
                border: on ? '1px solid var(--border)' : '1px solid transparent',
                color: on ? 'var(--src-learn)' : 'var(--ink-sub)',
                fontWeight: on ? 600 : 400,
                cursor: 'pointer',
              }}
              onClick={() => onModeChange(t)}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '4px 10px 0' }}>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="过滤文件名…"
          style={{
            width: '100%',
            height: 24,
            fontSize: 11,
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

      <div className="kb-scroll" style={{ flex: 1, padding: '4px 8px 10px' }}>
        {mode === 'knowledge' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px 4px' }}>
              笔记（{knowledgeFiles?.length ?? '…'}）
            </div>
            {knowledgeFiles
              ?.filter((e) => e.type === 'file' && READABLE_EXTS.has(e.ext) && keep(e.name))
              .map((e) => renderFile(e, 8))}
          </>
        )}

        {mode === 'review' && (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px 4px' }}>
              复习专题（{reviewTopics?.length ?? '…'}）
            </div>
            {reviewTopics?.map((t) => {
              const on = selectedTopic === t.name;
              return (
                <div
                  key={t.name}
                  className={`tree-row ${on ? 'active-learn' : ''}`}
                  style={{ fontFamily: 'var(--font-mono)', padding: '4px 8px', cursor: 'pointer' }}
                  onClick={() => onSelectTopic(t.name)}
                  onContextMenu={(ev) => ctx.open(ev, buildFileMenuItems({ source: SOURCE, relPath: `review/${t.name}`, isDir: true, onTrashed }))}
                >
                  <Icon name="folder" size={12} color={on ? 'var(--src-learn)' : 'var(--ink-muted)'} />
                  <span style={{ flex: 1, fontSize: 12, fontWeight: on ? 600 : 400 }}>{t.name}</span>
                </div>
              );
            })}

            {selectedTopic && (
              <>
                {topicSystem.filter((e) => keep(e.name)).length > 0 && (
                  <>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 8px 4px' }}>
                      系统文件
                    </div>
                    {topicSystem.filter((e) => keep(e.name)).map((e) => renderFile(e, 12))}
                  </>
                )}
                {topicChapters.filter((e) => keep(e.name)).length > 0 && (
                  <>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '12px 8px 4px' }}>
                      章节材料
                    </div>
                    {topicChapters.filter((e) => keep(e.name)).map((e) => renderFile(e, 12))}
                  </>
                )}
                {topicFiles && topicSystem.length === 0 && topicChapters.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '8px' }}>专题内无可读文件</div>
                )}
              </>
            )}
          </>
        )}
      </div>
      {ctx.Element}
    </div>
  );
}

// ── 右栏内容 body（供 CollapsibleSection 嵌入） ─────────
function ProgressMetaBody({ progress }) {
  if (!progress) return <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>加载中…</div>;
  return (
    <div style={{ padding: '4px 12px 0' }}>
      <div className="kb-card" style={{ padding: 12 }}>
        <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginBottom: 4 }}>
          {progress.path}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-sub)', lineHeight: 1.55 }}>
          {progress.totalStages} 阶段 · 完成 {progress.doneStages}
          <br />
          当前 <b style={{ color: 'var(--src-learn)' }}>阶段 {progress.currentIndex ?? '?'}</b>
          <br />
          最近更新 {new Date(progress.mtime).toLocaleDateString('zh-CN')}
          <br />
          <span style={{ color: 'var(--ink-muted)' }}>{(progress.size / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    </div>
  );
}

function StreakBody({ progress }) {
  return (
    <div style={{ padding: '4px 12px 0' }}>
      <div className="kb-card" style={{ padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
          <span className="kb-serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--ink)' }}>
            {progress?.streak ?? 0}
          </span>
          <span style={{ fontSize: 12, color: 'var(--ink-sub)' }}>天连续</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
            累计 {progress?.activityDates?.length ?? 0}
          </span>
        </div>
        {progress?.recent30 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: 2 }}>
              {progress.recent30.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.active ? '有记录' : '无'}`}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 2,
                    background: d.active ? 'var(--src-learn)' : 'var(--bg-sunk)',
                    border: '1px solid var(--border)',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-muted)', marginTop: 4 }}>
              <span>30 天前</span>
              <span>今天</span>
            </div>
          </>
        ) : (
          <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>加载中…</div>
        )}
      </div>
    </div>
  );
}

// ── 主组件 ────────────────────────────────────────────────
export default function LearnSpacious() {
  const [progress, setProgress] = useState(null);
  const [progressError, setProgressError] = useState(null);

  const [mode, setMode] = useState('review'); // 'knowledge' | 'review'
  const [knowledgeFiles, setKnowledgeFiles] = useState(null);
  const [reviewTopics, setReviewTopics] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicFiles, setTopicFiles] = useState(null);

  const [selectedPath, setSelectedPath] = useRememberedPath('kb-last-path-learn');
  const [file, setFile] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [tocState, setTocState] = useState({ toc: [], activeId: null, jumpTo: () => {} });
  const [recent, , removeRecent] = useRecentFiles('kb-recent-learn', selectedPath);

  // 折叠顶部的阶段/断点卡片（持久化到 localStorage；首次默认值走 Prefs）
  const prefs = usePrefs();
  const [progressOpen, setProgressOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('learn-progress-open');
    if (saved === '1' || saved === '0') return saved === '1';
    return !!prefs.behavior.openBreakpointOnLearn;
  });
  useEffect(() => {
    localStorage.setItem('learn-progress-open', progressOpen ? '1' : '0');
  }, [progressOpen]);

  // 加载 progress.md 结构化数据
  useEffect(() => {
    getLearnProgress()
      .then(setProgress)
      .catch((err) => setProgressError(err.message));
  }, []);

  // 加载 knowledge 列表
  useEffect(() => {
    getTree(SOURCE, 'knowledge')
      .then(({ entries }) => setKnowledgeFiles(entries))
      .catch(() => setKnowledgeFiles([]));
  }, []);

  // 加载 review 专题列表
  useEffect(() => {
    getTree(SOURCE, 'review')
      .then(({ entries }) => {
        const topics = entries.filter((e) => e.type === 'dir');
        setReviewTopics(topics);
        if (topics.length) setSelectedTopic(topics[0].name);
      })
      .catch(() => setReviewTopics([]));
  }, []);

  // 加载选中专题的文件
  useEffect(() => {
    if (!selectedTopic) return;
    setTopicFiles(null);
    getTree(SOURCE, `review/${selectedTopic}`)
      .then(({ entries }) => {
        setTopicFiles(entries);
        // 只在 selectedPath 不在本专题内时才 auto-select，避免覆盖 URL 指定的文件
        if (selectedPath && selectedPath.startsWith(`review/${selectedTopic}/`)) return;
        const progressMd = entries.find((e) => e.type === 'file' && MARKDOWN_EXTS.has(e.ext) && (e.name.startsWith('_当前进度') || e.name === '_当前进度.md'));
        const first = entries.find((e) => e.type === 'file' && READABLE_EXTS.has(e.ext));
        const pick = progressMd || first;
        if (pick) setSelectedPath(pick.path);
      })
      .catch(() => setTopicFiles([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTopic]);

  // URL 变化时推导 mode / topic
  useEffect(() => {
    if (!selectedPath) return;
    if (selectedPath.startsWith('review/')) {
      const topic = selectedPath.split('/')[1];
      setMode('review');
      if (topic && selectedTopic !== topic) setSelectedTopic(topic);
    } else {
      setMode('knowledge');
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

  // 订阅文件变更 → 当前文件 / progress.md 有变则重拉；当前文件被删则提示
  useEffect(() => {
    const unsub = subscribeFileEvents((evt) => {
      if (evt.source !== SOURCE) return;
      if (evt.path === 'progress.md') {
        getLearnProgress().then(setProgress).catch(() => {});
      }
      if (selectedPath && evt.path === selectedPath) {
        if (evt.type === 'unlink') {
          setFile(null);
          setFileError('该文件已被外部删除或移走');
        } else {
          getFile(SOURCE, selectedPath)
            .then((f) => { setFile(f); setFileError(null); })
            .catch(() => {});
        }
      }
    });
    return unsub;
  }, [selectedPath]);

  const handleModeChange = (m) => {
    setMode(m);
    setSelectedPath(null);
    setFile(null);
  };

  const handleTrashed = (path) => {
    removeRecent(path);
    if (selectedPath && isSameOrChild(selectedPath, path)) {
      setSelectedPath(null);
      setFile(null);
      setFileError(null);
    }
    if (path === 'progress.md') {
      setProgress(null);
      setProgressError('progress.md 已移到系统废纸篓');
    }
    setKnowledgeFiles((items) => items?.filter((e) => !isSameOrChild(e.path, path)) ?? items);
    if (path.startsWith('review/')) {
      const parts = path.split('/');
      const topic = parts[1];
      if (topic && parts.length === 2) {
        setReviewTopics((items) => items?.filter((e) => e.name !== topic) ?? items);
        if (selectedTopic === topic) {
          setSelectedTopic(null);
          setTopicFiles(null);
        }
      } else if (topic && selectedTopic === topic) {
        setTopicFiles((items) => items?.filter((e) => !isSameOrChild(e.path, path)) ?? items);
      }
    }
  };

  const openProgressMd = () => setSelectedPath('progress.md');

  return (
    <Frame>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Sidebar
          mode={mode}
          onModeChange={handleModeChange}
          knowledgeFiles={knowledgeFiles}
          reviewTopics={reviewTopics}
          selectedTopic={selectedTopic}
          onSelectTopic={(t) => {
            setSelectedTopic(t);
            setSelectedPath(null);
          }}
          topicFiles={topicFiles}
          selectedPath={selectedPath}
          onSelectFile={setSelectedPath}
          onTrashed={handleTrashed}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <CollapsibleProgressHeader
            progress={progress}
            open={progressOpen}
            onToggle={() => setProgressOpen((o) => !o)}
            onOpenProgressMd={openProgressMd}
          />
          <HealthBanner progress={progress} onOpenProgressMd={openProgressMd} />

          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {progressError && !selectedPath ? (
              <ErrorState msg={`progress.md 加载失败：${progressError}`} />
            ) : !selectedPath ? (
              <EmptyState hint="从左栏选一个可读文件开始阅读，或点上方 progress.md 查看全文" />
            ) : fileLoading ? (
              <LoadingState />
            ) : fileError ? (
              <ErrorState msg={`无法加载文件：${fileError}`} />
            ) : file ? (
              <MarkdownView path={selectedPath} file={file} onToc={setTocState} />
            ) : (
              <LoadingState />
            )}
          </div>
        </div>

        <SidePanel storageKey="learn-right" defaultWidth={300}>
          <div className="kb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <CollapsibleSection
              storageKey="kb-section-learn-toc"
              title="目录"
              icon="list"
              accent="var(--src-learn)"
              badge={tocState.toc.length || null}
            >
              <TocList
                toc={tocState.toc}
                activeId={tocState.activeId}
                onJump={tocState.jumpTo}
                accentColor="var(--src-learn)"
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-learn-recent"
              title="最近打开"
              icon="clock"
              accent="var(--src-learn)"
              badge={recent.length || null}
            >
              <RecentList
                recent={recent}
                currentPath={selectedPath}
                onSelect={setSelectedPath}
                accent="var(--src-learn)"
                source="learn"
                onTrashed={handleTrashed}
              />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-learn-progress"
              title="progress.md 元信息"
              icon="file"
              accent="var(--src-learn)"
            >
              <ProgressMetaBody progress={progress} />
            </CollapsibleSection>
            <CollapsibleSection
              storageKey="kb-section-learn-streak"
              title="连续打卡"
              icon="sparkle"
              accent="var(--src-learn)"
              badge={progress?.streak ?? null}
            >
              <StreakBody progress={progress} />
            </CollapsibleSection>
          </div>
        </SidePanel>
      </div>
    </Frame>
  );
}
