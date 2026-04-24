// Shared primitives + mock data for all page designs.
// Exported onto window for cross-script-tag use.

// ── Icons ────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, stroke = 1.6, color = "currentColor", style }) => {
  const s = size;
  const common = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
    case "book":
      return <svg {...common}><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z"/><path d="M6 3v16"/></svg>;
    case "graph":
      return <svg {...common}><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M7 7l4 10M17 7l-4 10"/></svg>;
    case "folder":
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>;
    case "folder-open":
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3V7z"/><path d="M3 9h18l-2 7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z"/></svg>;
    case "file":
      return <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>;
    case "chev-r":
      return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case "chev-d":
      return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case "play":
      return <svg {...common}><path d="M6 4l14 8-14 8V4z"/></svg>;
    case "link":
      return <svg {...common}><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5"/></svg>;
    case "arrow-l":
      return <svg {...common}><path d="M20 12H4m0 0l6-6m-6 6l6 6"/></svg>;
    case "arrow-r":
      return <svg {...common}><path d="M4 12h16m0 0l-6-6m6 6l-6 6"/></svg>;
    case "home":
      return <svg {...common}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>;
    case "clock":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "tag":
      return <svg {...common}><path d="M20 12l-8 8-8-8V4h8l8 8z"/><circle cx="8" cy="8" r="1.2"/></svg>;
    case "settings":
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "check":
      return <svg {...common}><path d="M4 12l5 5L20 6"/></svg>;
    case "flag":
      return <svg {...common}><path d="M4 22V4"/><path d="M4 5h12l-2 4 2 4H4"/></svg>;
    case "sparkle":
      return <svg {...common}><path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M5.6 18.4l3.5-3.5M14.9 9.1l3.5-3.5"/></svg>;
    case "grid":
      return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "list":
      return <svg {...common}><path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"/></svg>;
    case "terminal":
      return <svg {...common}><path d="M4 4h16v16H4z"/><path d="M7 9l3 3-3 3M13 15h5"/></svg>;
    case "inbox":
      return <svg {...common}><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6"/><path d="M3 13h5l1 3h6l1-3h5"/></svg>;
    case "hash":
      return <svg {...common}><path d="M5 9h14M5 15h14M10 4l-2 16M16 4l-2 16"/></svg>;
    case "x":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "dot":
      return <svg {...common}><circle cx="12" cy="12" r="3"/></svg>;
    case "git":
      return <svg {...common}><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 8v8M8 18h4a4 4 0 0 0 4-4v-2"/></svg>;
    case "pin":
      return <svg {...common}><path d="M12 3l4 4-2 2v6l-2 2-2-2V9L8 7l4-4z"/><path d="M12 17v4"/></svg>;
    case "drag":
      return <svg {...common}><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>;
    case "filter":
      return <svg {...common}><path d="M3 5h18l-7 9v5l-4-2v-3L3 5z"/></svg>;
    default:
      return null;
  }
};

// ── Source pill ──────────────────────────────────────────────────────
const SourcePill = ({ source }) => {
  const map = {
    learn: { label: "学习项目", cls: "learn" },
    obsidian: { label: "Obsidian", cls: "obsidian" },
    work: { label: "公司项目", cls: "work" },
  };
  const m = map[source];
  return (
    <span className={`src-pill ${m.cls}`}>
      <span className={`src-dot ${m.cls}`} />
      {m.label}
    </span>
  );
};

// ── TopBar ───────────────────────────────────────────────────────────
const TopBar = ({ active = "home", search = "" }) => (
  <div className="kb-topbar">
    <div className="kb-logo">
      <span className="mark">知</span>
      <span>个人知识库</span>
    </div>
    <div style={{display:'flex', gap:2, marginLeft: 18}}>
      {[
        {id:"home", label:"首页", icon:"home"},
        {id:"learn", label:"学习项目", icon:"flag"},
        {id:"obsidian", label:"Obsidian", icon:"graph"},
        {id:"work", label:"公司笔记", icon:"terminal"},
      ].map(it => (
        <button key={it.id} className="kb-btn ghost" style={{
          height: 28, padding:'0 10px', fontSize: 13,
          color: active===it.id ? 'var(--ink)':'var(--ink-sub)',
          background: active===it.id ? 'var(--bg-raised)' : 'transparent',
          border: active===it.id ? '1px solid var(--border)' : '1px solid transparent',
        }}>
          <Icon name={it.icon} size={14}/> {it.label}
        </button>
      ))}
    </div>
    <div style={{flex:1, maxWidth: 520, margin: '0 auto', position:'relative'}}>
      <div style={{
        display:'flex', alignItems:'center', gap: 8,
        height: 32, padding:'0 10px',
        borderRadius: 7, background: 'var(--bg-raised)',
        border:'1px solid var(--border)',
      }}>
        <Icon name="search" size={14} color="var(--ink-muted)"/>
        <span style={{color: search ? 'var(--ink)':'var(--ink-muted)', fontSize: 13, flex: 1}}>
          {search || "搜索笔记…  跨三个源全文检索"}
        </span>
        <span className="kc">⌘</span><span className="kc">K</span>
      </div>
    </div>
    <div style={{display:'flex', alignItems:'center', gap: 6}}>
      <button className="kb-btn ghost" style={{width:32, padding:0, justifyContent:'center'}}>
        <Icon name="sparkle" size={14}/>
      </button>
      <button className="kb-btn ghost" style={{width:32, padding:0, justifyContent:'center'}}>
        <Icon name="settings" size={14}/>
      </button>
    </div>
  </div>
);

// ── Window frame (used around each page) ─────────────────────────────
const Frame = ({ children, width = 1280, height = 840, active = "home", search = "" }) => (
  <div className="kb-root kb-window" style={{ width, height }}>
    <TopBar active={active} search={search}/>
    <div style={{ height: height - 46, display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      {children}
    </div>
  </div>
);

// ── Source card (home page) ──────────────────────────────────────────
const VaultCard = ({ source, title, path, files, updated, summary, extra, onFocus }) => {
  const srcMap = {
    learn: { accent: "var(--src-learn)", bg: "var(--src-learn-bg)", icon: "flag" },
    obsidian: { accent: "var(--src-obsidian)", bg: "var(--src-obsidian-bg)", icon: "graph" },
    work: { accent: "var(--src-work)", bg: "var(--src-work-bg)", icon: "terminal" },
  };
  const s = srcMap[source];
  return (
    <div className="kb-card" style={{ padding: 16, display:'flex', flexDirection:'column', gap: 10, position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: s.bg, color: s.accent, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name={s.icon} size={15}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{title}</div>
          <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{path}</div>
        </div>
      </div>
      {extra}
      <div style={{ fontSize: 13, color:'var(--ink-sub)', lineHeight: 1.55, flex: 1 }}>
        {summary}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 12, fontSize: 11.5, color:'var(--ink-muted)', paddingTop: 8, borderTop:'1px solid var(--border)' }}>
        <span><Icon name="file" size={11}/> {files} 文件</span>
        <span><Icon name="clock" size={11}/> {updated}</span>
      </div>
    </div>
  );
};

// ── Section headers ──────────────────────────────────────────────────
const SectionHeader = ({ source, title, subtitle, right }) => (
  <div style={{ display:'flex', alignItems:'flex-end', gap: 12, marginBottom: 14 }}>
    <div style={{ flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 4 }}>
        <SourcePill source={source}/>
        <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>{subtitle}</span>
      </div>
      <h2 className="kb-serif" style={{ margin:0, fontSize: 22, fontWeight: 600, letterSpacing:'-0.015em' }}>{title}</h2>
    </div>
    {right}
  </div>
);

// ── Mock data ────────────────────────────────────────────────────────
const MOCK = {
  learn: {
    name: "AI Agent 学习项目",
    path: "~/Desktop/文档/个人学习项目/",
    stage: "阶段 3 · Tool Use 与函数调用",
    stageIndex: 2,
    stages: ["基础认知","Prompting 与结构化","Tool Use","Memory & RAG","Agents"],
    progressPct: 44,
    breakpoint: {
      file: "knowledge/18-function-calling-strict-mode.md",
      line: "读到 §4 JSON Schema 严格模式的 edge cases",
      updated: "昨天 22:14",
    },
    streak: 12,
    reviewTopics: [
      { name: "prompting",   due: "今天", count: 5 },
      { name: "embeddings",  due: "2 天后", count: 5 },
      { name: "react-loop",  due: "逾期 1 天", count: 5, overdue: true },
    ],
  },
  obsidian: {
    name: "个人知识库",
    path: "~/Desktop/文档/个人知识库/",
    files: 482,
    inbox: 7,
    mocs: 14,
    recentNotes: [
      "10-Projects/知识库看板.md",
      "20-Areas/前端工程化.md",
      "30-Resources/RAG 综述.md",
      "90-MOC/学习方法 MOC.md",
    ],
  },
  work: {
    name: "公司项目外挂笔记",
    path: "~/work/code/sanwan/notes/",
    projects: [
      { id: "gc-base-log", name: "gc-base-log", active: 2, updated: "1 小时前" },
      { id: "gc-cls",      name: "gc-cls",      active: 0, updated: "昨天" },
      { id: "iam",         name: "iam",         active: 3, updated: "20 分钟前" },
      { id: "message-center-all", name: "message-center-all", active: 1, updated: "2 天前" },
    ],
  },
};

Object.assign(window, { Icon, SourcePill, TopBar, Frame, VaultCard, SectionHeader, MOCK });
