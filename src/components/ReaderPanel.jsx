import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { Icon } from './primitives.jsx';
import { usePrefs } from '../lib/usePrefs.js';
import { getCachedSources } from '../lib/api.js';

// 滚动位置记忆：URL（pathname + search）→ scrollTop
// MarkdownView 切换文件时会被父组件 unmount/remount，所以用模块级 Map 跨实例存
const scrollMemory = new Map();

function slugify(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-龥-]/g, '')
    .slice(0, 64);
}

// 把相对路径基于当前文件目录解析成 source 内的相对路径
function resolveRelativeMdPath(currentMdPath, relHref) {
  if (!currentMdPath) return null;
  const baseDir = currentMdPath.includes('/')
    ? currentMdPath.slice(0, currentMdPath.lastIndexOf('/'))
    : '';
  const combined = baseDir ? baseDir + '/' + relHref : relHref;
  const parts = combined.split('/');
  const out = [];
  for (const p of parts) {
    if (p === '' || p === '.') continue;
    if (p === '..') {
      if (out.length === 0) return null; // 穿出源根
      out.pop();
    } else {
      out.push(p);
    }
  }
  return out.join('/');
}

// 接管 markdown 里的 <a> 点击行为
//   1. http/https → target=_blank（Electron 跳系统浏览器）
//   2. 锚点 # → 保留默认（TOC / 页内跳转）
//   3. 绝对路径匹配三源 realRoot/root → 内部路由跳转
//   4. 相对路径 *.md / *.markdown → 基于当前文件目录解析后内部跳转
//   5. 其他（未识别）→ 阻止 + 灰化 + title 提示
function processLinks(container, sources, navigate, ctx = {}) {
  if (!container) return;
  const { sourceId: currentSource, mdPath: currentMdPath } = ctx;
  const anchors = container.querySelectorAll('a[href]');
  anchors.forEach((a) => {
    if (a.dataset.kbLinkDone === '1') return;
    a.dataset.kbLinkDone = '1';

    const rawHref = a.getAttribute('href') || '';
    if (!rawHref) return;

    if (/^https?:\/\//i.test(rawHref)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return;
    }
    if (rawHref.startsWith('#')) return;

    const href = decodeURIComponent(rawHref);

    // 3. 绝对路径匹配某个源
    if (href.startsWith('/')) {
      let matched = null;
      for (const s of sources) {
        const prefixes = [s.realRoot, s.root].filter(Boolean);
        for (const prefix of prefixes) {
          const p = prefix.endsWith('/') ? prefix : prefix + '/';
          if (href.startsWith(p)) {
            matched = { sourceId: s.id, rel: href.slice(p.length) };
            break;
          }
        }
        if (matched) break;
      }
      // 3b. 没匹配：公司笔记的镜像路径兜底（md 里常写 greencloud/xxx 绝对路径，其实对应 work 源的 xxx/md/...）
      if (!matched && /\/md\/(codex|memory|需求|notebooks)\//.test(href)) {
        const m = href.match(/\/([^\/]+)\/md\/(.+\.(?:md|markdown))(?:#.*)?$/i);
        if (m) {
          matched = { sourceId: 'work', rel: `${m[1]}/md/${m[2]}`, fallback: true };
        }
      }
      if (matched && /\.(md|markdown)$/i.test(matched.rel)) {
        a.style.color = `var(--src-${matched.sourceId})`;
        if (matched.fallback) a.title = `镜像到 work 源: ${matched.rel}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(`/${matched.sourceId}?path=${encodeURIComponent(matched.rel)}`);
        });
        return;
      }
    } else if (/\.(md|markdown)(#.*)?$/i.test(href) && currentSource) {
      // 4. 相对路径 md：基于当前文件目录解析
      const [pathPart] = href.split('#');
      const resolved = resolveRelativeMdPath(currentMdPath, pathPart);
      if (resolved) {
        a.style.color = `var(--src-${currentSource})`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(`/${currentSource}?path=${encodeURIComponent(resolved)}`);
        });
        return;
      }
    }

    // 5. 不能识别：阻止 navigate 防白屏
    a.addEventListener('click', (e) => {
      e.preventDefault();
    });
    a.title = '无法识别的链接：' + href;
    a.style.cursor = 'not-allowed';
    a.style.opacity = '0.55';
  });
}

export function EmptyState({ hint }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
      {hint || '左栏点一个 .md 文件开始阅读'}
    </div>
  );
}

export function LoadingState() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
      加载中…
    </div>
  );
}

export function ErrorState({ msg }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', fontSize: 13, padding: 24 }}>
      <div className="kb-mono" style={{ maxWidth: 520, textAlign: 'center' }}>{msg}</div>
    </div>
  );
}

// 按需加载 mermaid（只在第一次遇到 mermaid 代码块时拉）
let mermaidPromise = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'neutral',
        fontFamily: 'var(--font-sans), sans-serif',
        securityLevel: 'strict',
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

async function enhanceRendered(container, { renderMermaid = true } = {}) {
  if (!container) return;

  // 1. 代码块语法高亮（跳过 mermaid）
  const codeBlocks = container.querySelectorAll('pre > code');
  codeBlocks.forEach((el) => {
    const classes = el.className || '';
    if (classes.includes('language-mermaid')) return;
    if (el.dataset.hljsDone === '1') return;
    try {
      hljs.highlightElement(el);
      el.dataset.hljsDone = '1';
    } catch { /* ignore */ }
  });

  // 2. Mermaid 渲染（可由 prefs 关闭）
  if (!renderMermaid) return;
  const mermaidBlocks = container.querySelectorAll('pre > code.language-mermaid');
  if (mermaidBlocks.length > 0) {
    const mermaid = await loadMermaid();
    let idx = 0;
    for (const el of mermaidBlocks) {
      if (el.dataset.mermaidDone === '1') continue;
      const src = el.textContent;
      const wrapper = document.createElement('div');
      wrapper.className = 'md-mermaid';
      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}-${idx++}`, src);
        wrapper.innerHTML = svg;
      } catch (err) {
        wrapper.innerHTML = `<div class="md-mermaid-error">Mermaid 渲染失败: ${String(err.message || err)}</div><pre><code>${src.replace(/</g, '&lt;')}</code></pre>`;
      }
      el.parentElement?.replaceWith(wrapper);
      el.dataset.mermaidDone = '1';
    }
  }
}

/**
 * 共享的 Markdown 渲染面板。
 * props:
 *   path    — 相对 source 的路径
 *   file    — /api/file 返回体 { html, meta, size, mtime, ... }
 *   badge   — 可选 ReactNode，显示在面包屑末尾（例如 "活跃任务"）
 *   onToc   — 可选回调，当目录变化时报告 { toc, activeId, jumpTo }，页面可把 TOC 放到自己的右栏
 */
export function MarkdownView({ path, file, badge, onToc }) {
  const mdRef = useRef(null);
  const scrollRef = useRef(null);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sources, setSources] = useState([]);
  const prefs = usePrefs();
  const navigate = useNavigate();
  const location = useLocation();
  const urlKey = `${location.pathname}${location.search}`;

  useEffect(() => {
    getCachedSources().then(setSources).catch(() => setSources([]));
  }, []);

  // 滚动位置记忆：滚动时持续存，unmount/URL 切换时再保一次
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const onScroll = () => {
      scrollMemory.set(urlKey, container.scrollTop);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      // 卸载或 URL 切换前快照最后位置（点链接跳走那一刻的滚动位置）
      scrollMemory.set(urlKey, container.scrollTop);
      container.removeEventListener('scroll', onScroll);
    };
  }, [urlKey]);

  // 恢复滚动位置：mount 后立即同步设置 scrollTop，避免闪一下回顶
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const saved = scrollMemory.get(urlKey);
    container.scrollTop = typeof saved === 'number' ? saved : 0;
  }, [urlKey]);

  const segments = path.split('/');
  const dirParts = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];
  const mtime = file.mtime ? new Date(file.mtime).toLocaleString('zh-CN', { hour12: false }) : '';

  // 渲染后处理：代码高亮 / Mermaid / 抽 TOC / 接管 a 链接
  useEffect(() => {
    enhanceRendered(mdRef.current, { renderMermaid: prefs.behavior.renderMermaid });
    processLinks(mdRef.current, sources, navigate, {
      sourceId: file?.source,
      mdPath: path,
    });
    const container = mdRef.current;
    if (!container) return;
    const headings = container.querySelectorAll('h2, h3');
    const items = [];
    const seen = new Set();
    headings.forEach((h, i) => {
      const text = (h.textContent || '').trim();
      if (!text) return;
      let id = h.id || slugify(text);
      if (!id || seen.has(id)) id = `h-${i}-${slugify(text)}`;
      seen.add(id);
      h.id = id;
      items.push({ id, text, level: h.tagName === 'H2' ? 2 : 3 });
    });
    setToc(items);
    setActiveId(items[0]?.id || null);
  }, [file?.html, prefs.behavior.renderMermaid, sources]);

  // 滚动时高亮当前小节
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || toc.length === 0) return;
    const onScroll = () => {
      const headings = toc
        .map((t) => document.getElementById(t.id))
        .filter(Boolean);
      const top = container.getBoundingClientRect().top;
      let current = toc[0]?.id;
      for (const h of headings) {
        const rect = h.getBoundingClientRect();
        if (rect.top - top < 80) current = h.id;
        else break;
      }
      setActiveId(current);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener('scroll', onScroll);
  }, [toc]);

  const jumpTo = React.useCallback((id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // 把 TOC 数据暴露给外部（页面把它渲染到自己的右栏）
  useEffect(() => {
    if (typeof onToc !== 'function') return;
    onToc({ toc, activeId, jumpTo });
  }, [toc, activeId, jumpTo, onToc]);

  // 页面卸载 / 切换文件时，通知外部清空
  useEffect(() => {
    return () => {
      if (typeof onToc === 'function') onToc({ toc: [], activeId: null, jumpTo });
    };
  }, [onToc, jumpTo]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, background: 'var(--bg)' }}>
      <div
        style={{
          padding: '8px 22px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-tint)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11.5,
          color: 'var(--ink-sub)',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {dirParts.map((d, i) => (
          <React.Fragment key={i}>
            <span>{d}</span>
            <Icon name="chev-r" size={10} />
          </React.Fragment>
        ))}
        <span style={{ color: 'var(--ink)' }}>{fileName}</span>
        {badge}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-muted)' }}>
          {file.size ? `${(file.size / 1024).toFixed(1)} KB` : ''}  · {mtime}
        </span>
      </div>

      <div ref={scrollRef} className="kb-scroll" style={{ flex: 1, padding: '32px 40px 40px', minHeight: 0 }}>
        <div className="md" style={{ maxWidth: 780, margin: '0 auto' }}>
          <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6 }}>{path}</div>
          {file.meta && file.meta.tags && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(Array.isArray(file.meta.tags) ? file.meta.tags : [file.meta.tags]).map((t) => (
                <span key={t} className="kb-mono" style={{ fontSize: 10.5, color: 'var(--src-obsidian)', background: 'var(--src-obsidian-bg)', padding: '2px 8px', borderRadius: 3 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div ref={mdRef} dangerouslySetInnerHTML={{ __html: file.html }} />
        </div>
      </div>
    </div>
  );
}

// ── TOC 列表（纯内容，交给外部 CollapsibleSection 包装） ─────
// 接收 MarkdownView 通过 onToc 报告的数据 + jumpTo。空列表时返回提示。
export function TocList({ toc, activeId, onJump, accentColor = 'var(--src-learn)' }) {
  if (!toc || toc.length === 0) {
    return (
      <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '6px 14px' }}>
        当前文档没有标题
      </div>
    );
  }
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.55 }}>
      {toc.map((it) => {
        const active = activeId === it.id;
        return (
          <li key={it.id}>
            <button
              type="button"
              onClick={() => onJump?.(it.id)}
              title={it.text}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '4px 14px',
                paddingLeft: 14 + (it.level - 2) * 12,
                background: 'transparent',
                border: 0,
                borderLeft: `2px solid ${active ? accentColor : 'transparent'}`,
                cursor: 'pointer',
                color: active ? 'var(--ink)' : 'var(--ink-sub)',
                fontSize: it.level === 2 ? 12 : 11.5,
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {it.text}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
