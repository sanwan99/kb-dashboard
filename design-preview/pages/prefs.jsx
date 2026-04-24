// Preferences page + Components inventory + Tech stack recommendation

const PrefsPage = () => {
  return (
    <Frame active="home">
      <div className="kb-scroll" style={{ flex:1, padding:'24px 32px 32px' }}>
        <h1 className="kb-serif" style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing:'-0.02em' }}>首选项</h1>
        <div style={{ color:'var(--ink-sub)', fontSize: 13.5, marginTop: 4, marginBottom: 24 }}>本地存于 <code className="kb-mono" style={{ fontSize: 12 }}>~/.config/kb-board/config.json</code></div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18 }}>
          {/* Sources */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 12 }}>笔记源</div>
            {[
              { src:'learn', n:'学习项目', path:'~/Desktop/文档/个人学习项目/', on: true },
              { src:'obsidian', n:'Obsidian 知识库', path:'~/Desktop/文档/个人知识库/', on: true },
              { src:'work', n:'公司项目笔记', path:'~/work/code/sanwan/notes/', on: true },
            ].map(s => (
              <div key={s.src} style={{ display:'flex', alignItems:'center', gap: 12, padding:'12px 0', borderTop:'1px solid var(--border)' }}>
                <span className={`src-dot ${s.src}`} style={{ width: 10, height: 10 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.n}</div>
                  <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>{s.path}</div>
                </div>
                <div style={{ width: 36, height: 20, borderRadius: 10, background: s.on ? 'var(--accent)' : 'var(--bg-sunk)', border:'1px solid var(--border)', position:'relative', flexShrink: 0 }}>
                  <div style={{ position:'absolute', top: 1, left: s.on ? 17 : 1, width: 16, height: 16, borderRadius: 8, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.2)' }}/>
                </div>
              </div>
            ))}
            <button className="kb-btn ghost" style={{ marginTop: 10, fontSize: 12 }}>+ 新增源</button>
          </div>

          {/* Appearance */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 12 }}>外观</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color:'var(--ink-sub)', marginBottom: 6 }}>主题</div>
              <div style={{ display:'flex', gap: 6 }}>
                {[{n:'浅色',on:true},{n:'深色'},{n:'跟随系统'}].map(t => (
                  <button key={t.n} className="kb-btn" style={{
                    flex: 1, fontSize: 12,
                    background: t.on ? 'var(--ink)' : 'var(--bg-raised)',
                    color: t.on ? '#fff' : 'var(--ink)',
                    borderColor: t.on ? 'var(--ink)' : 'var(--border)',
                  }}>{t.n}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color:'var(--ink-sub)', marginBottom: 6 }}>信息密度</div>
              <div style={{ display:'flex', gap: 6 }}>
                {[{n:'呼吸感'},{n:'标准',on:true},{n:'紧凑'}].map(t => (
                  <button key={t.n} className="kb-btn" style={{
                    flex: 1, fontSize: 12,
                    background: t.on ? 'var(--ink)' : 'var(--bg-raised)',
                    color: t.on ? '#fff' : 'var(--ink)',
                    borderColor: t.on ? 'var(--ink)' : 'var(--border)',
                  }}>{t.n}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color:'var(--ink-sub)', marginBottom: 6 }}>正文字号 · 15 px</div>
              <div style={{ height: 4, borderRadius: 2, background:'var(--bg-sunk)', position:'relative' }}>
                <div style={{ position:'absolute', height:'100%', width:'35%', background:'var(--accent)', borderRadius: 2 }}/>
                <div style={{ position:'absolute', top: -5, left:'35%', width: 14, height: 14, borderRadius: 7, background:'#fff', border:'1.5px solid var(--accent)', transform:'translateX(-50%)' }}/>
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 12 }}>行为</div>
            {[
              { n:'启动时恢复上次打开的文件', on:true },
              { n:'学习项目页默认打开当前断点', on:true },
              { n:'自动保存 markdown 编辑', on:false },
              { n:'把 [[wikilink]] 点击行为设为：同窗打开', on:true },
              { n:'Mermaid & KaTeX 渲染', on:true },
            ].map(r => (
              <div key={r.n} style={{ display:'flex', alignItems:'center', gap: 12, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                <div style={{ flex: 1, fontSize: 13 }}>{r.n}</div>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: r.on ? 'var(--accent)' : 'var(--bg-sunk)', border:'1px solid var(--border)', position:'relative' }}>
                  <div style={{ position:'absolute', top: 1, left: r.on ? 15 : 1, width: 14, height: 14, borderRadius: 7, background:'#fff' }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Keyboard */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 12 }}>键盘</div>
            {[
              { n:'全局搜索', k:['⌘','K'] },
              { n:'继续断点', k:['⌘','⇧','Return'] },
              { n:'跳到收件箱', k:['⌘','1'] },
              { n:'切换源', k:['⌘','['] },
              { n:'反向链接面板', k:['⌘','⇧','L'] },
            ].map(r => (
              <div key={r.n} style={{ display:'flex', alignItems:'center', gap: 12, padding:'8px 0', borderTop:'1px solid var(--border)' }}>
                <div style={{ flex: 1, fontSize: 13 }}>{r.n}</div>
                <div style={{ display:'flex', gap: 3 }}>
                  {r.k.map((k,i) => <span key={i} className="kc">{k}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Components inventory */}
        <h2 className="kb-serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing:'-0.015em', margin:'36px 0 12px' }}>组件清单</h2>
        <div className="kb-card" style={{ padding: 18 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 14 }}>
            {[
              { g:'布局', items:['AppFrame (TopBar + Workspace)','TopBar · 全局搜索框','Sidebar · 树 / PARA / 项目','SplitPane · 可拖动分栏','RightDrawer · 反链 / 元数据'] },
              { g:'卡片与列表', items:['VaultCard · 源卡片','FolderCard · PARA 文件夹卡','ProjectCard · 公司项目卡','FileRow · 统一文件行','ActivityRow · 时间轴项'] },
              { g:'源身份', items:['SourcePill · 源标签（蓝 / 紫 / 橙）','SourceDot · 8px 色点','SourceSection · 带源色的小节头'] },
              { g:'学习项目', items:['StageBar · 五阶段进度条','BreakpointCard · 当前断点','ReviewQueue · 复习队列','StreakGrid · 连续打卡热图','ReviewTabs · 5-tab 切换'] },
              { g:'Obsidian', items:['ParaTree · PARA 目录树','BacklinksPanel · 反链抽屉','LocalGraph · 小型图谱','TagChip · 标签','QuickEntries · 收件箱/MOC/防再犯'] },
              { g:'公司项目', items:['ProjectTree · md/codex 分支','CodexCurrentNode · current/ 高亮','ActiveTaskCard · 活跃任务卡','CrossProjectPanel · 全部活跃聚合'] },
              { g:'Markdown', items:['MarkdownView · 渲染器','CodeBlock · shiki 高亮','MermaidBlock · 流程图','CalloutBlock · note/warn/tip','TaskItem · GFM checkbox','WikiLink · [[…]] 内链','EmbedBlock · ![[…]] 嵌入','MathBlock · KaTeX'] },
              { g:'搜索', items:['OmniSearch · 顶部搜索框','SearchFilters · 来源 / 类型 / 时间','SearchGroup · 按源分组','SearchHit · 单条结果'] },
              { g:'基础元素', items:['Button · primary/ghost','Badge · ok/warn/live','KeyCap · 键盘帽','Callout · 同 md','Tooltip','Toggle','SegmentedControl'] },
            ].map(g => (
              <div key={g.g}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>{g.g}</div>
                <ul style={{ listStyle:'none', padding: 0, margin: 0 }}>
                  {g.items.map(it => (
                    <li key={it} style={{ display:'flex', alignItems:'center', gap: 6, fontSize: 12, padding:'3px 0', color:'var(--ink-sub)' }}>
                      <span style={{ width: 4, height: 4, borderRadius: 2, background:'var(--border-strong)' }}/>
                      <span className="kb-mono" style={{ fontSize: 11.5 }}>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <h2 className="kb-serif" style={{ fontSize: 22, fontWeight: 600, letterSpacing:'-0.015em', margin:'36px 0 12px' }}>推荐技术栈</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
          <div className="kb-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--src-learn)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>前端</div>
            <ul style={{ listStyle:'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
              <li><code className="kb-mono">vite</code> + <code className="kb-mono">react 18</code> + <code className="kb-mono">typescript</code></li>
              <li><code className="kb-mono">tailwindcss</code> + CSS 变量做三源色</li>
              <li><code className="kb-mono">markdown-it</code> + 自写 plugin 支持 <code>[[wikilink]]</code>/<code>![[embed]]</code></li>
              <li><code className="kb-mono">shiki</code> — 代码高亮（编译时主题）</li>
              <li><code className="kb-mono">mermaid</code> — 流程图按需懒加载</li>
              <li><code className="kb-mono">katex</code> — 数学公式</li>
              <li><code className="kb-mono">fuse.js</code> — 客户端模糊搜索索引</li>
              <li><code className="kb-mono">zustand</code> — 轻量状态（当前文件、展开项）</li>
              <li><code className="kb-mono">radix-ui/react-*</code> — 对话框、下拉、滑杆</li>
            </ul>
          </div>
          <div className="kb-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--src-work)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>后端（超轻 node）</div>
            <ul style={{ listStyle:'none', padding: 0, margin: 0, fontSize: 13, lineHeight: 1.8 }}>
              <li><code className="kb-mono">fastify</code> — 单进程 HTTP</li>
              <li><code className="kb-mono">chokidar</code> — 实时监听三个源目录变动</li>
              <li><code className="kb-mono">gray-matter</code> — frontmatter 解析</li>
              <li><code className="kb-mono">fast-glob</code> — 文件扫描</li>
              <li><code className="kb-mono">lunr</code> / <code className="kb-mono">minisearch</code> — 服务端全文索引</li>
              <li><code className="kb-mono">better-sqlite3</code>（可选）— 反链/索引持久化缓存</li>
              <li>单一入口 <code className="kb-mono">npm run dev</code> 并发启动 vite 和 fastify（concurrently）</li>
            </ul>
          </div>
          <div className="kb-card" style={{ padding: 16, gridColumn:'span 2' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--src-obsidian)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>关键 API 契约</div>
            <pre style={{ fontSize: 11.5, padding:'12px 14px', margin: 0 }}><code><span className="tok-c">// 三个源一视同仁，通过 sourceId 区分</span>{"\n"}GET /api/sources                        → [{'{'} id, kind, root, label, color {'}'}]{"\n"}GET /api/tree?source=obsidian&path=10   → FolderTree{"\n"}GET /api/file?source=learn&path=...     → {'{'} raw, html, meta, backlinks, outgoing {'}'}{"\n"}GET /api/backlinks?source=obsidian&path→ [{'{'} file, preview, line {'}'}]{"\n"}GET /api/search?q=...&source=...        → grouped hits (relevance + recency){"\n"}GET /api/learn/progress                 → {'{'} stage, breakpoint, streak, reviewQueue {'}'}{"\n"}GET /api/work/active-tasks              → codex current/ 聚合{"\n"}POST /api/breakpoint                    → 更新 progress.md 断点{"\n"}WS   /api/changes                       → 文件系统变更推送</code></pre>
          </div>
        </div>

        {/* Run */}
        <div className="kb-card" style={{ padding: 18, marginTop: 18, background:'var(--bg-tint)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>启动</div>
          <pre style={{ margin: 0, fontSize: 12.5, padding:'12px 14px' }}><code>$ git clone ... kb-board && cd kb-board{"\n"}$ cp config.example.json ~/.config/kb-board/config.json  <span className="tok-c"># 三个源路径</span>{"\n"}$ npm i && npm run dev{"\n"}  <span className="tok-c"># → frontend http://localhost:5173</span>{"\n"}  <span className="tok-c"># → api      http://localhost:5174</span></code></pre>
        </div>
      </div>
    </Frame>
  );
};

window.PrefsPage = PrefsPage;
