import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Frame, Icon, SourcePill } from '../components/primitives.jsx';
import { search as apiSearch, getSearchStats } from '../lib/api.js';

const SOURCE_LABELS = {
  learn: { label: '学习项目', kind: '学习' },
  obsidian: { label: 'Obsidian', kind: 'Obsidian' },
  work: { label: '公司项目', kind: '公司' },
};

// 跳转路由：打开搜索结果对应的页面并定位到文件
function resultLink(source, path) {
  const q = new URLSearchParams({ path }).toString();
  if (source === 'obsidian') return `/obsidian?${q}`;
  if (source === 'work') return `/work?${q}`;
  if (source === 'learn') return `/learn?${q}`;
  return '/';
}

function relTime(iso) {
  if (!iso) return '—';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return '今天';
  if (d === 1) return '昨天';
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

function HitCard({ hit }) {
  const iconColor = `var(--src-${hit.source})`;
  return (
    <Link
      to={resultLink(hit.source, hit.path)}
      className="kb-card"
      style={{ padding: '10px 14px', marginBottom: 6, display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={hit.source === 'work' ? 'git' : 'file'} size={12} color={iconColor} />
        <span className="kb-mono" style={{ fontSize: 11.5, color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 440 }}>
          {hit.path}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--ink-muted)' }}>
          score {hit.score} · {relTime(hit.mtime)}
        </span>
      </div>
      <div
        style={{ fontSize: 12.5, color: 'var(--ink-sub)', marginTop: 4, lineHeight: 1.55 }}
        dangerouslySetInnerHTML={{
          __html: hit.snippet.replace(/<mark>/g, '<span style="background:#F6E6A8;color:#5a4a2a;padding:0 3px;border-radius:2px;">').replace(/<\/mark>/g, '</span>'),
        }}
      />
    </Link>
  );
}

export default function Search() {
  const [sp] = useSearchParams();
  const [q, setQ] = useState(sp.get('q') || '');
  const [enabledSources, setEnabledSources] = useState({ learn: true, obsidian: true, work: true });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    getSearchStats().then(setStats).catch(() => {});
    inputRef.current?.focus();
  }, []);

  // debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setData(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(null);
      const srcs = Object.entries(enabledSources).filter(([, on]) => on).map(([k]) => k);
      apiSearch(q, { sources: srcs, limit: 60 })
        .then(setData)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [q, enabledSources]);

  const groupedCounts = useMemo(() => {
    if (!data) return { learn: 0, obsidian: 0, work: 0 };
    return {
      learn: data.grouped?.learn?.length ?? 0,
      obsidian: data.grouped?.obsidian?.length ?? 0,
      work: data.grouped?.work?.length ?? 0,
    };
  }, [data]);

  return (
    <Frame search={q}>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left: filters */}
        <div style={{ width: 220, padding: '18px 16px', borderRight: '1px solid var(--border)', background: 'var(--bg-tint)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            过滤
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6 }}>来源</div>
          {Object.entries(SOURCE_LABELS).map(([src, meta]) => {
            const on = enabledSources[src];
            const c = groupedCounts[src] || 0;
            return (
              <label key={src} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={(e) => setEnabledSources((s) => ({ ...s, [src]: e.target.checked }))}
                  style={{ margin: 0 }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: `var(--src-${src})`,
                    opacity: on ? 1 : 0.3,
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: 12.5, flex: 1 }}>{meta.label}</span>
                <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c}</span>
              </label>
            );
          })}

          <div style={{ fontSize: 11, color: 'var(--ink-muted)', margin: '18px 0 6px' }}>索引状态</div>
          <div className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.6 }}>
            {stats ? (
              <>
                {stats.ready ? '✓ 就绪' : '… 构建中'}
                <br />
                {stats.docCount} 篇 md
                <br />
                {stats.lastBuilt ? `构建于 ${new Date(stats.lastBuilt).toLocaleTimeString('zh-CN')}` : ''}
              </>
            ) : '…'}
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink-muted)', margin: '18px 0 6px' }}>提示</div>
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
            英文按词前缀 + 模糊；中文按字，搜 2+ 个字更准。
          </div>
        </div>

        {/* Main results */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '16px 24px 8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                padding: '0 12px',
                borderRadius: 8,
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                marginBottom: 10,
              }}
            >
              <Icon name="search" size={14} color="var(--ink-muted)" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索三源…（英文 / 中文都支持）"
                style={{
                  flex: 1,
                  border: 0,
                  outline: 0,
                  background: 'transparent',
                  fontSize: 14,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--ink)',
                }}
              />
              {q && (
                <button
                  className="kb-btn ghost"
                  style={{ width: 24, height: 24, padding: 0, justifyContent: 'center' }}
                  onClick={() => setQ('')}
                >
                  <Icon name="x" size={12} />
                </button>
              )}
            </div>

            {q && (
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', display: 'flex', alignItems: 'center', gap: 14 }}>
                {loading ? (
                  <span className="kb-mono" style={{ color: 'var(--ink-muted)' }}>搜索中…</span>
                ) : error ? (
                  <span style={{ color: 'var(--danger)' }}>错误：{error}</span>
                ) : data ? (
                  <>
                    <span><b>{data.total}</b> 个匹配 · <span className="kb-mono" style={{ color: 'var(--ink-muted)' }}>{data.took}ms</span></span>
                    <span><span className="src-dot learn" /> 学习 <b>{groupedCounts.learn}</b></span>
                    <span><span className="src-dot obsidian" /> Obsidian <b>{groupedCounts.obsidian}</b></span>
                    <span><span className="src-dot work" /> 公司 <b>{groupedCounts.work}</b></span>
                  </>
                ) : null}
              </div>
            )}
          </div>

          <div className="kb-scroll" style={{ flex: 1, padding: '10px 24px 24px' }}>
            {!q && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)', flexDirection: 'column', gap: 8 }}>
                <Icon name="search" size={24} color="var(--ink-muted)" />
                <div style={{ fontSize: 13 }}>在上方输入关键词跨三源搜索</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}>索引中 {stats?.docCount ?? '…'} 篇 md</div>
              </div>
            )}

            {q && data && data.total === 0 && !loading && (
              <div style={{ padding: 24, color: 'var(--ink-muted)', fontSize: 13 }}>
                无匹配结果。尝试更短的关键词或切换过滤。
              </div>
            )}

            {q && data && Object.entries(SOURCE_LABELS).map(([src, meta]) => {
              if (!enabledSources[src]) return null;
              const hits = data.grouped?.[src] || [];
              if (hits.length === 0) return null;
              return (
                <div key={src}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 0 8px', borderTop: '1px solid var(--border)' }}>
                    <SourcePill source={src} />
                    <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{meta.kind}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-muted)' }}>{hits.length} matches</span>
                  </div>
                  {hits.map((h) => (
                    <HitCard key={`${h.source}:${h.path}`} hit={h} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Frame>
  );
}
