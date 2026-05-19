import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { Icon } from './primitives.jsx';
import { usePrefs } from '../lib/usePrefs.js';
import { useTheme } from '../lib/useTheme.js';
import { getCachedSources } from '../lib/api.js';
import { isMarkdownExt, isReadablePath } from '../lib/fileTypes.js';

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

const FRONTMATTER_ORDER = ['title', 'type', 'status', 'owner', 'created', 'updated', 'completed'];

function formatMetaValue(value) {
  if (value == null) return '';
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
  }
  if (Array.isArray(value)) {
    return value.map(formatMetaValue).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function formatFrontmatter(meta) {
  if (!meta || typeof meta !== 'object') return '';
  const keys = Object.keys(meta);
  if (keys.length === 0) return '';
  const ordered = [
    ...FRONTMATTER_ORDER.filter((k) => Object.prototype.hasOwnProperty.call(meta, k)),
    ...keys.filter((k) => !FRONTMATTER_ORDER.includes(k)).sort((a, b) => a.localeCompare(b, 'zh-CN')),
  ];
  return ordered.map((k) => `${k}: ${formatMetaValue(meta[k])}`).join('\n');
}

// 把相对路径基于当前文件目录解析成 source 内的相对路径
function resolveRelativeReadablePath(currentPath, relHref) {
  if (!currentPath) return null;
  const baseDir = currentPath.includes('/')
    ? currentPath.slice(0, currentPath.lastIndexOf('/'))
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
//   4. 相对路径 *.md / *.markdown / *.sql → 基于当前文件目录解析后内部跳转
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
        const m = href.match(/\/([^\/]+)\/md\/(.+\.(?:md|markdown|sql))(?:#.*)?$/i);
        if (m) {
          matched = { sourceId: 'work', rel: `${m[1]}/md/${m[2]}`, fallback: true };
        }
      }
      if (matched && isReadablePath(matched.rel)) {
        a.style.color = `var(--src-${matched.sourceId})`;
        if (matched.fallback) a.title = `镜像到 work 源: ${matched.rel}`;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          navigate(`/${matched.sourceId}?path=${encodeURIComponent(matched.rel)}`);
        });
        return;
      }
    } else if (isReadablePath(href) && currentSource) {
      // 4. 相对路径可读文件：基于当前文件目录解析
      const [pathPart] = href.split('#');
      const resolved = resolveRelativeReadablePath(currentMdPath, pathPart);
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
      {hint || '左栏点一个可读文件开始阅读'}
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
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

// 基于项目 CSS 变量构造 mermaid themeVariables，跟随 light/dark 主题。
// 配色尽量贴 Claude 风：暖米白 + 节点白底、暖橙边框，线条走 ink-muted。
function computeMermaidConfig() {
  const cs = typeof window !== 'undefined' ? getComputedStyle(document.documentElement) : null;
  const v = (name, fallback = '') => (cs ? cs.getPropertyValue(name).trim() : '') || fallback;
  const isDark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';

  const ink = v('--ink', isDark ? '#E6DFD0' : '#1F1E1B');
  const inkSub = v('--ink-sub', isDark ? '#C2BBAC' : '#53504A');
  const inkMuted = v('--ink-muted', isDark ? '#8A857A' : '#8A857A');
  const bg = v('--bg', isDark ? '#1a1816' : '#FAF9F5');
  const bgRaised = v('--bg-raised', isDark ? '#26231f' : '#FFFFFF');
  const bgTint = v('--bg-tint', isDark ? '#1f1d1a' : '#F5F2EA');
  const bgSunk = v('--bg-sunk', isDark ? '#141311' : '#F2EFE6');
  const border = v('--border', isDark ? '#3a3631' : '#E6E1D4');
  const work = v('--src-work', '#C77A35');
  const workBg = v('--src-work-bg', isDark ? '#3b2c19' : '#F7ECDC');
  const learn = v('--src-learn', '#3766B8');
  const learnBg = v('--src-learn-bg', isDark ? '#1e2a3e' : '#E7EEF9');
  const obsidian = v('--src-obsidian', '#7A5AB8');
  const obsidianBg = v('--src-obsidian-bg', isDark ? '#2c2440' : '#EDE8F7');

  return {
    startOnLoad: false,
    theme: 'base',
    securityLevel: 'strict',
    fontFamily: 'Inter Tight, ui-sans-serif, system-ui, sans-serif',
    themeVariables: {
      // 基础文字 / 背景
      background: bg,
      mainBkg: bgRaised,
      textColor: ink,
      fontFamily: 'Inter Tight, ui-sans-serif, system-ui, sans-serif',
      fontSize: '13px',

      // 节点三种主题色：暖橙 / 米白 / 暖底
      primaryColor: bgRaised,
      primaryTextColor: ink,
      primaryBorderColor: work,
      secondaryColor: workBg,
      secondaryTextColor: ink,
      secondaryBorderColor: work,
      tertiaryColor: learnBg,
      tertiaryTextColor: ink,
      tertiaryBorderColor: learn,

      // 连线 / 边文字
      lineColor: inkMuted,
      edgeLabelBackground: bg,

      // 子图（cluster）
      clusterBkg: bgTint,
      clusterBorder: border,
      titleColor: ink,

      // 注释 / note
      noteBkgColor: isDark ? '#2f2a1f' : '#FFF6E3',
      noteTextColor: ink,
      noteBorderColor: isDark ? '#5c4a2a' : '#E6D4A8',

      // 时序图 actor
      actorBkg: bgRaised,
      actorBorder: work,
      actorTextColor: ink,
      actorLineColor: inkMuted,
      signalColor: ink,
      signalTextColor: ink,
      labelBoxBkgColor: workBg,
      labelBoxBorderColor: work,
      labelTextColor: ink,
      loopTextColor: ink,
      activationBkgColor: workBg,
      activationBorderColor: work,

      // 甘特
      sectionBkgColor: bgTint,
      sectionBkgColor2: bgSunk,
      taskBkgColor: learnBg,
      taskTextColor: ink,
      taskTextOutsideColor: inkSub,
      taskBorderColor: learn,
      gridColor: border,
      doneTaskBkgColor: obsidianBg,
      doneTaskBorderColor: obsidian,
      critBorderColor: v('--danger', '#B5452E'),
      critBkgColor: isDark ? '#3a1c1c' : '#F7E1DC',

      // 饼图调色盘（沿用三源色）
      pie1: work,
      pie2: learn,
      pie3: obsidian,
      pie4: v('--ok', '#3E8E5E'),
      pie5: v('--warn', '#B77A22'),
    },
  };
}

function attachCopyButton(pre, codeEl) {
  if (!pre || pre.dataset.copyDone === '1') return;
  pre.dataset.copyDone = '1';
  pre.style.position = 'relative';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'md-copy-btn';
  btn.textContent = '复制';
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = codeEl.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = '已复制';
      btn.classList.add('copied');
    } catch {
      btn.textContent = '失败';
    }
    setTimeout(() => {
      btn.textContent = '复制';
      btn.classList.remove('copied');
    }, 1500);
  });
  pre.appendChild(btn);
}

async function enhanceRendered(container, { renderMermaid = true, onRequestZoom } = {}) {
  if (!container) return;

  // 1. 代码块语法高亮 + 复制按钮（跳过 mermaid）
  const codeBlocks = container.querySelectorAll('pre > code');
  codeBlocks.forEach((el) => {
    const classes = el.className || '';
    if (classes.includes('language-mermaid')) return;
    if (el.dataset.hljsDone !== '1') {
      try {
        hljs.highlightElement(el);
        el.dataset.hljsDone = '1';
      } catch { /* ignore */ }
    }
    attachCopyButton(el.parentElement, el);
  });

  // 2. Mermaid 渲染（可由 prefs 关闭）
  if (!renderMermaid) return;
  const mermaidBlocks = container.querySelectorAll('pre > code.language-mermaid');
  if (mermaidBlocks.length > 0) {
    const mermaid = await loadMermaid();
    // 每次渲染前用最新 CSS 变量初始化，跟随 light/dark 主题
    mermaid.initialize(computeMermaidConfig());
    // 清扫上一次渲染遗留在 body 上的 stray 临时元素（mermaid 失败时会留下"Syntax error in text"占位 SVG）
    document.querySelectorAll('body > [id^="mermaid-"], body > [id^="dmermaid-"]').forEach((n) => n.remove());

    let idx = 0;
    for (const el of mermaidBlocks) {
      if (el.dataset.mermaidDone === '1') continue;
      const src = el.textContent;
      const wrapper = document.createElement('div');
      wrapper.className = 'md-mermaid';
      const renderId = `mermaid-${Date.now()}-${idx++}`;
      // 提供一个 hidden 临时容器给 mermaid.render，避免它把临时元素塞到 body 末尾
      const tempHost = document.createElement('div');
      tempHost.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:0;height:0;overflow:hidden;visibility:hidden;';
      document.body.appendChild(tempHost);
      try {
        const { svg } = await mermaid.render(renderId, src, tempHost);
        wrapper.innerHTML = svg;
        wrapper.title = '双击放大';
        wrapper.style.cursor = 'zoom-in';
        wrapper.addEventListener('dblclick', (e) => {
          e.preventDefault();
          if (typeof onRequestZoom === 'function') onRequestZoom(svg);
        });
      } catch (err) {
        wrapper.innerHTML = `<div class="md-mermaid-error">Mermaid 渲染失败: ${String(err.message || err)}</div><pre><code>${src.replace(/</g, '&lt;')}</code></pre>`;
      } finally {
        // 清理临时容器 + 兜底清理 body 上同 id 的 stray
        tempHost.remove();
        document.getElementById(renderId)?.remove();
        document.getElementById('d' + renderId)?.remove();
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
  // 标记"我们正在程序性写 scrollTop"（避免恢复 → 被 clamp → scroll 事件 → 覆盖 saved）
  const isRestoringRef = useRef(false);
  const [toc, setToc] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [sources, setSources] = useState([]);
  const [zoomedSvg, setZoomedSvg] = useState(null);
  const prefs = usePrefs();
  const { resolvedTheme } = useTheme();
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
      // 关键：忽略程序性滚动（restore 写 scrollTop 也会触发 scroll 事件，
      // 浏览器对超出 docHeight 的值会 clamp，否则会把 clamp 后的值覆盖回 saved）
      if (isRestoringRef.current) return;
      scrollMemory.set(urlKey, container.scrollTop);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      // 卸载或 URL 切换前快照最后位置；恢复进行中跳过，避免 clamp 值污染 saved
      if (!isRestoringRef.current) {
        scrollMemory.set(urlKey, container.scrollTop);
      }
      container.removeEventListener('scroll', onScroll);
    };
  }, [urlKey]);

  const segments = path.split('/');
  const dirParts = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];
  const mtime = file.mtime ? new Date(file.mtime).toLocaleString('zh-CN', { hour12: false }) : '';
  const isMarkdown = isMarkdownExt(file?.ext);
  const frontmatterText = isMarkdown ? formatFrontmatter(file.meta) : '';

  // 渲染后处理：代码高亮 / Mermaid / 抽 TOC / 接管 a 链接
  // 依赖 resolvedTheme：主题切换时把 innerHTML 重置，让 mermaid 等重新按新配色渲染
  useEffect(() => {
    if (mdRef.current && mdRef.current.innerHTML !== file.html) {
      mdRef.current.innerHTML = file.html;
    }
    enhanceRendered(mdRef.current, {
      renderMermaid: isMarkdown && prefs.behavior.renderMermaid,
      onRequestZoom: setZoomedSvg,
    });
    if (isMarkdown) {
      processLinks(mdRef.current, sources, navigate, {
        sourceId: file?.source,
        mdPath: path,
      });
    }
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
  }, [file?.html, file?.ext, prefs.behavior.renderMermaid, sources, resolvedTheme]);

  // 恢复滚动位置：必须在 innerHTML 注入之后跑，所以独立成一个依赖 file.html 的 useEffect。
  // 放在 html-setting effect 之后声明，保证 effect 执行顺序在它之后。
  // 内容（mermaid / 图片）异步加载会让 docHeight 晚才长全。策略：
  // 1. 写 scrollTop 时打开 isRestoringRef，让 save listener 忽略 clamp 后的 scroll 事件
  // 2. ResizeObserver 监听内容尺寸 + 100ms 兜底轮询，直到 scrollTop 真的落到 saved
  // 3. 8 秒兜底超时
  useEffect(() => {
    const container = scrollRef.current;
    const content = mdRef.current;
    if (!container) return;
    const saved = scrollMemory.get(urlKey);
    if (typeof saved !== 'number') {
      isRestoringRef.current = true;
      container.scrollTop = 0;
      // 释放 flag 留两帧，让因为这次写而触发的 scroll 事件先消化
      requestAnimationFrame(() => requestAnimationFrame(() => {
        isRestoringRef.current = false;
      }));
      return;
    }

    let done = false;
    let observer = null;
    let pollInterval = null;

    const tryRestore = () => {
      if (done) return;
      isRestoringRef.current = true;
      container.scrollTop = saved;
      if (Math.abs(container.scrollTop - saved) <= 4) {
        done = true;
        observer && observer.disconnect();
        pollInterval && clearInterval(pollInterval);
      }
      // scroll 事件异步派发，留两帧再释放 flag，避免被自己写的 scroll 反向覆盖 saved
      requestAnimationFrame(() => requestAnimationFrame(() => {
        isRestoringRef.current = false;
      }));
    };

    tryRestore();
    if (done) return;

    // 文档还没长全：双管齐下
    // (a) ResizeObserver：内容尺寸变化时立刻重试
    if (typeof ResizeObserver !== 'undefined' && content) {
      observer = new ResizeObserver(tryRestore);
      observer.observe(content);
    }
    // (b) 100ms 轮询：兜底（图片懒加载、字体加载等不一定触发 RO）
    pollInterval = setInterval(tryRestore, 100);

    // 8 秒超时
    const timer = setTimeout(() => {
      done = true;
      observer && observer.disconnect();
      clearInterval(pollInterval);
      isRestoringRef.current = false;
    }, 8000);

    return () => {
      done = true;
      clearTimeout(timer);
      clearInterval(pollInterval);
      observer && observer.disconnect();
      isRestoringRef.current = false;
    };
  }, [urlKey, file?.html]);

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
          {frontmatterText && (
            <div
              className="kb-mono"
              style={{
                whiteSpace: 'pre-wrap',
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '14px 18px',
                margin: '0 0 22px',
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--ink-muted)',
              }}
            >
              {frontmatterText}
            </div>
          )}
          <div ref={mdRef} dangerouslySetInnerHTML={{ __html: file.html }} />
        </div>
      </div>

      {zoomedSvg && <MermaidZoomModal svg={zoomedSvg} onClose={() => setZoomedSvg(null)} />}
    </div>
  );
}

// ── Mermaid 放大模态：滚轮缩放 + 拖拽平移 + Esc/遮罩关闭 ─────
function MermaidZoomModal({ svg, onClose }) {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const dragRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onWheel = (e) => {
    e.preventDefault();
    // 缩放系数；trackpad(pinch) 走较小 deltaY，鼠标滚轮一次 ±100 左右
    // 按 deltaMode 区分 + clamp 单次变化，避免鼠标滚轮一下跳太狠
    const factor = e.deltaMode === 1 ? 0.12 : 0.006; // LINE(1) / PIXEL(0)
    const raw = -e.deltaY * factor;
    const step = Math.max(-0.35, Math.min(0.35, raw));
    setTransform((t) => {
      const next = Math.min(8, Math.max(0.15, t.scale * (1 + step)));
      return { ...t, scale: next };
    });
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: transform.x, baseY: transform.y };
    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      setTransform((t) => ({ ...t, x: d.baseX + (ev.clientX - d.startX), y: d.baseY + (ev.clientY - d.startY) }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const reset = () => setTransform({ scale: 1, x: 0, y: 0 });
  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(8, t.scale * 1.6) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(0.15, t.scale / 1.6) }));

  const btnStyle = {
    width: 30, height: 30, border: '1px solid var(--border)', background: 'var(--bg-raised)',
    color: 'var(--ink)', cursor: 'pointer', borderRadius: 6, fontSize: 14, fontWeight: 600,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15, 15, 20, 0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        ref={frameRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onDoubleClick={reset}
        style={{
          position: 'relative',
          width: '92vw', height: '88vh',
          background: 'var(--bg)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          overflow: 'hidden',
          cursor: dragRef.current ? 'grabbing' : 'grab',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            transition: 'none',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, background: 'var(--bg-tint)', padding: 6, borderRadius: 8, border: '1px solid var(--border)' }}
        >
          <button type="button" onClick={zoomOut} title="缩小" style={btnStyle}>−</button>
          <button type="button" onClick={reset} title="重置 (双击画布亦可)" style={{ ...btnStyle, fontSize: 11, width: 40 }}>1:1</button>
          <button type="button" onClick={zoomIn} title="放大" style={btnStyle}>+</button>
          <button type="button" onClick={onClose} title="关闭 (Esc)" style={{ ...btnStyle, color: 'var(--danger)' }}>×</button>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>
          {Math.round(transform.scale * 100)}%　·　滚轮缩放 · 拖拽平移 · 双击还原 · Esc 关闭
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
