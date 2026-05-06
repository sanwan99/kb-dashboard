import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './primitives.jsx';
import { search as apiSearch } from '../lib/api.js';

const SOURCE_META = {
  learn: { color: 'var(--src-learn)', label: '学习', icon: 'flag' },
  obsidian: { color: 'var(--src-obsidian)', label: 'Obsidian', icon: 'graph' },
  work: { color: 'var(--src-work)', label: '公司', icon: 'git' },
  custom: { color: 'var(--src-custom)', label: '自定义', icon: 'folder-open' },
};
const FALLBACK_META = { color: 'var(--ink-muted)', label: '未知', icon: 'file' };

function stripMark(html) {
  return html.replace(/<\/?mark>/g, '');
}

function renderSnippet(html) {
  return html
    .replace(/<mark>/g, '<span style="background:#F6E6A8;color:#5a4a2a;padding:0 3px;border-radius:2px;">')
    .replace(/<\/mark>/g, '</span>');
}

export default function GlobalSearchBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  // ⌘K / Ctrl+K 聚焦；Esc 关闭
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 点外面关闭
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // debounce 搜索
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await apiSearch(q, { limit: 10 });
        setResults(r);
        setActiveIdx(0);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const hits = results?.results || [];

  const goTo = (hit) => {
    setOpen(false);
    setQ('');
    setResults(null);
    navigate(`/${hit.source}?path=${encodeURIComponent(hit.path)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (hits[activeIdx]) {
        goTo(hits[activeIdx]);
      } else if (q.trim()) {
        setOpen(false);
        navigate(`/search?q=${encodeURIComponent(q)}`);
      }
    }
  };

  const showDropdown = open && (q.trim() || loading);

  return (
    <div ref={wrapRef} style={{ flex: 1, maxWidth: 520, margin: '0 auto', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 32,
          padding: '0 10px',
          borderRadius: 7,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
        }}
      >
        <Icon name="search" size={14} color="var(--ink-muted)" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="搜索笔记…  跨全部来源全文检索"
          style={{
            flex: 1,
            border: 0,
            outline: 0,
            background: 'transparent',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            color: 'var(--ink)',
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setResults(null); inputRef.current?.focus(); }}
            style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2, color: 'var(--ink-muted)' }}
            title="清空"
          >
            <Icon name="x" size={12} />
          </button>
        )}
        <span className="kc">⌘</span>
        <span className="kc">K</span>
      </div>

      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 28px -12px rgba(60,40,20,0.22), 0 2px 6px -2px rgba(60,40,20,0.08)',
            zIndex: 100,
            maxHeight: 520,
            overflow: 'auto',
          }}
        >
          {loading && (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
              搜索中…
            </div>
          )}

          {!loading && results && results.total === 0 && (
            <div style={{ padding: 14, fontSize: 12.5, color: 'var(--ink-muted)' }}>
              无匹配结果 · 试试更短的关键词
            </div>
          )}

          {!loading && hits.length > 0 && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border)',
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span>
                  {results.total} 个匹配 · 显示前 {hits.length} · {results.took}ms
                </span>
                <span style={{ marginLeft: 'auto' }}>
                  <span className="kc">↑</span> <span className="kc">↓</span> 导航 · <span className="kc">↵</span> 打开 ·{' '}
                  <span className="kc">Esc</span> 关闭
                </span>
              </div>

              {hits.map((h, i) => {
                const meta = SOURCE_META[h.source] || FALLBACK_META;
                const active = i === activeIdx;
                return (
                  <button
                    key={`${h.source}:${h.path}`}
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => goTo(h)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 4,
                      width: '100%',
                      padding: '10px 12px',
                      background: active ? 'var(--bg-sunk)' : 'transparent',
                      border: 0,
                      borderBottom: '1px solid var(--border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon name={meta.icon} size={12} color={meta.color} />
                      <span
                        style={{
                          fontSize: 10.5,
                          color: meta.color,
                          fontWeight: 600,
                          background: `var(--src-${h.source}-bg)`,
                          padding: '1px 6px',
                          borderRadius: 3,
                        }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className="kb-mono"
                        style={{
                          fontSize: 12,
                          color: 'var(--ink)',
                          fontWeight: 600,
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {h.path}
                      </span>
                      <span className="kb-mono" style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                        {h.score}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--ink-sub)',
                        lineHeight: 1.5,
                        maxHeight: 36,
                        overflow: 'hidden',
                      }}
                      dangerouslySetInnerHTML={{ __html: renderSnippet(h.snippet) }}
                    />
                  </button>
                );
              })}

              {results.total > hits.length && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/search?q=${encodeURIComponent(q)}`);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--src-learn)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  查看全部 {results.total} 条匹配 →
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
