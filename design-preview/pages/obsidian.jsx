// Obsidian browsing page — PARA tree + markdown + backlinks

const ObsidianPage = () => {
  return (
    <Frame active="obsidian">
      <div style={{ flex:1, display:'flex', minHeight: 0 }}>
        {/* Sidebar: PARA tree */}
        <div style={{ width: 260, background:'var(--bg-tint)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 12px 8px' }}>
            <SourcePill source="obsidian"/>
            <div className="kb-serif" style={{ fontSize: 14.5, fontWeight: 600, marginTop: 8 }}>个人知识库</div>
            <div className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>PARA · 482 文件</div>
          </div>

          {/* Quick entries */}
          <div style={{ display:'flex', gap: 4, padding:'0 10px 10px', flexWrap:'wrap' }}>
            <button className="kb-btn ghost" style={{ height: 24, fontSize: 11, color:'var(--src-obsidian)', background:'var(--src-obsidian-bg)' }}>
              <Icon name="inbox" size={11}/> 收件箱 <span style={{ marginLeft: 2, opacity: 0.75 }}>7</span>
            </button>
            <button className="kb-btn ghost" style={{ height: 24, fontSize: 11 }}>
              <Icon name="graph" size={11}/> MOC
            </button>
            <button className="kb-btn ghost" style={{ height: 24, fontSize: 11 }}>
              防再犯
            </button>
          </div>

          <div className="kb-scroll" style={{ flex: 1, padding:'4px 6px 10px', fontSize: 12.5 }}>
            {[
              { i:'folder', n:'00-收件箱', c: 7, badge: true },
              { i:'folder', n:'05-待确认', c: 3 },
              { i:'folder-open', n:'10-Projects', c: 42, open: true, children: [
                { i:'file', n:'知识库看板.md', active: true },
                { i:'file', n:'RAG Demo.md' },
                { i:'folder', n:'个人网站' },
              ]},
              { i:'folder', n:'20-Areas', c: 96 },
              { i:'folder', n:'30-Resources', c: 218 },
              { i:'folder', n:'40-Archives', c: 84 },
              { i:'folder', n:'50-防再犯', c: 12 },
              { i:'folder', n:'80-方法论', c: 6 },
              { i:'folder-open', n:'90-MOC', c: 14, open: true, children: [
                { i:'file', n:'学习方法 MOC.md' },
                { i:'file', n:'Agent 地图.md' },
                { i:'file', n:'工具链 MOC.md' },
              ]},
              { i:'folder', n:'99-模板', c: 11 },
            ].map(it => (
              <React.Fragment key={it.n}>
                <div className="tree-row" style={{ gap: 4, padding:'3px 6px' }}>
                  <Icon name={it.open ? 'chev-d' : 'chev-r'} size={10} color="var(--ink-muted)"/>
                  <Icon name={it.i} size={12} color={it.open ? 'var(--src-obsidian)' : 'var(--ink-muted)'}/>
                  <span className="kb-mono" style={{ fontSize: 12, flex: 1 }}>{it.n}</span>
                  {it.badge && <span style={{ width: 16, height: 16, borderRadius: 8, background:'var(--src-obsidian)', color:'#fff', fontSize: 10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 600 }}>{it.c}</span>}
                  {!it.badge && <span style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>{it.c}</span>}
                </div>
                {it.children && it.children.map(c => (
                  <div key={c.n} className={`tree-row ${c.active ? 'active' : ''}`} style={{ gap: 4, padding:'2px 6px 2px 22px' }}>
                    <Icon name={c.i} size={11} color={c.active ? 'var(--src-obsidian)' : 'var(--ink-muted)'}/>
                    <span className="kb-mono" style={{ fontSize: 11.5 }}>{c.n}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Tags */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 6 }}>标签</div>
            <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
              {["#ai-agent","#rag","#系统设计","#复盘","#学习方法"].map(t => (
                <span key={t} className="kb-mono" style={{ fontSize: 10.5, color:'var(--src-obsidian)', background:'var(--src-obsidian-bg)', padding:'1px 6px', borderRadius: 3 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Main: markdown */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0, background:'var(--bg)' }}>
          {/* Breadcrumb */}
          <div style={{ padding:'8px 22px', borderBottom:'1px solid var(--border)', background:'var(--bg-tint)', display:'flex', alignItems:'center', gap: 8, fontSize: 11.5, color:'var(--ink-sub)', fontFamily:'var(--font-mono)' }}>
            <span>10-Projects</span>
            <Icon name="chev-r" size={10}/>
            <span style={{ color:'var(--ink)' }}>知识库看板.md</span>
            <span style={{ marginLeft:'auto', color:'var(--ink-muted)' }}>5 反链 · 3 wikilink · 1 embed</span>
          </div>

          <div className="kb-scroll" style={{ flex: 1, padding:'32px 40px 40px', display:'flex', justifyContent:'center' }}>
            <div className="md" style={{ width: '100%', maxWidth: 720 }}>
              <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', marginBottom: 6 }}>10-Projects/知识库看板.md</div>
              <h1>知识库看板</h1>
              <div style={{ display:'flex', gap: 6, marginBottom: 18 }}>
                <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--src-obsidian)', background:'var(--src-obsidian-bg)', padding:'2px 8px', borderRadius: 3 }}>#项目</span>
                <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--src-obsidian)', background:'var(--src-obsidian-bg)', padding:'2px 8px', borderRadius: 3 }}>#工具链</span>
                <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>created: 2026-04-19</span>
              </div>

              <div className="callout note">
                <div className="callout-title">note</div>
                目标：聚合三个笔记仓（学习项目 / Obsidian / 公司项目），出 Figma 级设计稿。
              </div>

              <h2>背景</h2>
              <p>现有三个 Markdown 仓各有不同结构 —— 按 <a href="#">PARA</a> 组织的知识库 <span className="wikilink">[[PARA 方法论]]</span>，阶段化的学习项目 <span className="wikilink">[[AI Agent 学习路径]]</span>，以及公司项目的 <span className="wikilink">[[codex 任务流]]</span>。需要一个统一的浏览入口。</p>

              <h2>关键能力</h2>
              <ul>
                <li>支持 <code>[[wikilink]]</code> 跳转与 <code>![[embed]]</code> 嵌入</li>
                <li>跨源全文搜索（见 <span className="wikilink">[[搜索设计草案]]</span>）</li>
                <li>学习项目的 <b>当前断点</b> 一键恢复</li>
                <li>公司笔记的 <code>md/codex/current/</code> 高亮</li>
              </ul>

              <h2>架构草图</h2>
              <div className="embed">
                <div className="embed-head">
                  <Icon name="link" size={11}/>
                  ![[architecture.png]]
                </div>
                <div className="img-placeholder">architecture.png — 三源 → 聚合层 → UI</div>
              </div>

              <h2>进度</h2>
              <ul style={{ listStyle:'none', padding: 0 }}>
                <li className="task"><span className="cb checked"/> <div>采集三个仓的结构差异</div></li>
                <li className="task"><span className="cb checked"/> <div>与 <span className="wikilink">[[Claude]]</span> 讨论视觉方向</div></li>
                <li className="task"><span className="cb"/> <div>产出高保真静态稿</div></li>
                <li className="task"><span className="cb"/> <div>实现 MVP（见 <span className="wikilink broken">[[实现计划]]</span>）</div></li>
              </ul>

              <h2>相关</h2>
              <p>See also <span className="wikilink">[[学习方法 MOC]]</span> · <span className="wikilink">[[工具链 MOC]]</span></p>
            </div>
          </div>
        </div>

        {/* Right: backlinks */}
        <div style={{ width: 280, background:'var(--bg-tint)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
              <Icon name="link" size={13} color="var(--src-obsidian)"/>
              <b style={{ fontSize: 13 }}>反向链接</b>
              <span className="badge" style={{ marginLeft:'auto', background:'var(--src-obsidian-bg)', color:'var(--src-obsidian)', borderColor:'#DFD5F0' }}>5</span>
            </div>
            <div style={{ fontSize: 11, color:'var(--ink-muted)' }}>谁引用了这篇笔记</div>
          </div>
          <div className="kb-scroll" style={{ flex: 1, padding:'10px 12px' }}>
            {[
              { n:'学习方法 MOC.md', p:'90-MOC/', q:'…聚合工具参见 [[知识库看板]]，目前在设计阶段…' },
              { n:'工具链 MOC.md', p:'90-MOC/', q:'…本地优先的笔记浏览器 → [[知识库看板]] 是其中一个方向…' },
              { n:'周会-20260420.md', p:'00-收件箱/', q:'…把 [[知识库看板]] 的设计稿给 Claude 评估…' },
              { n:'RAG Demo.md', p:'10-Projects/', q:'…复用 [[知识库看板]] 的搜索索引层…' },
              { n:'2026-04-21.md', p:'20-Areas/日记/', q:'…晚上继续推进 [[知识库看板]] 的组件拆分…' },
            ].map((r, i) => (
              <div key={i} className="kb-card" style={{ padding: 10, marginBottom: 8, borderRadius: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <Icon name="file" size={11} color="var(--src-obsidian)"/>
                  <span className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink)', fontWeight: 600, flex: 1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.n}</span>
                </div>
                <div className="kb-mono" style={{ fontSize: 10, color:'var(--ink-muted)', marginTop: 2 }}>{r.p}</div>
                <div style={{ fontSize: 11.5, color:'var(--ink-sub)', lineHeight: 1.5, marginTop: 6 }}>{r.q}</div>
              </div>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', padding:'10px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 6 }}>局部图谱</div>
            <div style={{ height: 110, background:'var(--bg-raised)', border:'1px solid var(--border)', borderRadius: 6, position:'relative', overflow:'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 280 110">
                <line x1="140" y1="55" x2="60" y2="25" stroke="#DFD5F0" strokeWidth="1"/>
                <line x1="140" y1="55" x2="220" y2="25" stroke="#DFD5F0" strokeWidth="1"/>
                <line x1="140" y1="55" x2="60" y2="85" stroke="#DFD5F0" strokeWidth="1"/>
                <line x1="140" y1="55" x2="220" y2="85" stroke="#DFD5F0" strokeWidth="1"/>
                <line x1="140" y1="55" x2="200" y2="95" stroke="#DFD5F0" strokeWidth="1"/>
                <circle cx="60" cy="25" r="4" fill="#7A5AB8" opacity="0.5"/>
                <circle cx="220" cy="25" r="4" fill="#7A5AB8" opacity="0.5"/>
                <circle cx="60" cy="85" r="4" fill="#7A5AB8" opacity="0.5"/>
                <circle cx="220" cy="85" r="4" fill="#7A5AB8" opacity="0.5"/>
                <circle cx="200" cy="95" r="4" fill="#7A5AB8" opacity="0.5"/>
                <circle cx="140" cy="55" r="7" fill="#7A5AB8"/>
                <text x="140" y="72" fontSize="9" textAnchor="middle" fill="#7A5AB8" fontFamily="var(--font-mono)">当前</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.ObsidianPage = ObsidianPage;
