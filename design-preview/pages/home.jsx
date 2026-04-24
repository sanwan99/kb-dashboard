// Home page — default: 上下三段卡片墙 (stacked horizontal walls per source)

const HomePage = () => {
  return (
    <Frame active="home">
      <div className="kb-scroll" style={{ flex:1, padding: '20px 28px 28px' }}>
        {/* Greeting */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="kb-serif" style={{ margin:0, fontSize: 28, fontWeight: 600, letterSpacing:'-0.02em' }}>
              晚上好，<span style={{ color:'var(--accent)' }}>Haolin</span>
            </h1>
            <div style={{ color:'var(--ink-sub)', fontSize: 13.5, marginTop: 4 }}>
              三个笔记仓，共 <b>541</b> 个文件 · 最近 7 天编辑 <b>23</b> 篇 · 学习连续 <b>12</b> 天
            </div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <button className="kb-btn"><Icon name="inbox" size={14}/> 收件箱 <span className="badge" style={{ marginLeft: 2 }}>7</span></button>
            <button className="kb-btn primary"><Icon name="play" size={13}/> 继续上次学习</button>
          </div>
        </div>

        {/* ── Band 1: 学习项目 ──────────────────── */}
        <SectionHeader
          source="learn"
          title="学习项目"
          subtitle="~/Desktop/文档/个人学习项目/"
          right={<button className="kb-btn ghost" style={{ fontSize: 12 }}>查看全部 <Icon name="arrow-r" size={12}/></button>}
        />
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
          {/* Hero card: breakpoint */}
          <div className="kb-card" style={{ padding: 18, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top: 0, right: 0, width: 140, height: 140, background:'radial-gradient(circle at top right, var(--src-learn-bg), transparent 70%)' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
                <SourcePill source="learn"/>
                <span className="badge live"><span className="src-dot" style={{background:'var(--src-learn)'}}/> 当前断点</span>
              </div>
              <h3 className="kb-serif" style={{ margin:'0 0 4px', fontSize: 18, fontWeight: 600 }}>AI Agent 学习项目</h3>
              <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', marginBottom: 14 }}>
                knowledge/18-function-calling-strict-mode.md
              </div>
              <div style={{ fontSize: 13.5, color:'var(--ink-sub)', lineHeight: 1.6, marginBottom: 14 }}>
                读到 <b style={{color:'var(--ink)'}}>§4 JSON Schema 严格模式的 edge cases</b> — 下一节是 "嵌套对象与 oneOf 的互斥失效"。
              </div>

              {/* Stage progress */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color:'var(--ink-muted)', marginBottom: 6 }}>
                  <span>阶段 3 / 5 · Tool Use 与函数调用</span>
                  <span className="kb-mono">44%</span>
                </div>
                <div style={{ height: 6, background:'var(--bg-sunk)', borderRadius: 3, overflow:'hidden', display:'flex' }}>
                  {[1,1,0.44,0,0].map((v,i) => (
                    <div key={i} style={{ flex: 1, marginRight: i<4?2:0, background: v>=1 ? 'var(--src-learn)' : v>0 ? 'var(--src-learn)' : 'transparent', opacity: v<1 && v>0 ? 0.6 : 1, width: v>0 && v<1 ? `${v*100}%` : '100%' }}/>
                  ))}
                </div>
              </div>

              <div style={{ display:'flex', gap: 8 }}>
                <button className="kb-btn primary" style={{ height: 32 }}><Icon name="play" size={13}/> 从断点继续</button>
                <button className="kb-btn" style={{ height: 32 }}>进度表</button>
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap: 6, fontSize: 12, color:'var(--ink-muted)' }}>
                  <Icon name="clock" size={12}/> 昨天 22:14
                </div>
              </div>
            </div>
          </div>

          {/* Review queue */}
          <div className="kb-card" style={{ padding: 16, display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <Icon name="clock" size={14} color="var(--src-learn)"/>
                <b style={{ fontSize: 13 }}>复习队列</b>
              </div>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>3 topic</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 6, flex: 1 }}>
              {MOCK.learn.reviewTopics.map(t => (
                <div key={t.name} style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px 10px', borderRadius: 6, background:'var(--bg-sunk)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: t.overdue ? 'var(--danger)' : 'var(--src-learn)' }}/>
                  <span className="kb-mono" style={{ fontSize: 12.5, color:'var(--ink)', flex: 1 }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: t.overdue ? 'var(--danger)' : 'var(--ink-muted)' }}>{t.due}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Streak + today */}
          <div className="kb-card" style={{ padding: 16, display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 12 }}>
              <Icon name="flag" size={14} color="var(--src-learn)"/>
              <b style={{ fontSize: 13 }}>今日学习</b>
            </div>
            <div style={{ display:'flex', alignItems:'baseline', gap: 4, marginBottom: 4 }}>
              <span className="kb-serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color:'var(--ink)' }}>12</span>
              <span style={{ fontSize: 13, color:'var(--ink-sub)' }}>天连续</span>
            </div>
            <div style={{ fontSize: 12, color:'var(--ink-muted)', marginBottom: 12 }}>最长 23 天 · 本周 5/7</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap: 3 }}>
              {[1,1,1,0,1,1,0.3].map((v,i) => (
                <div key={i} style={{ height: 24, borderRadius: 3, background: v>=1 ? 'var(--src-learn)' : v>0 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)' }}/>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize: 10, color:'var(--ink-faint)', marginTop: 4 }}>
              <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
            </div>
          </div>
        </div>

        {/* ── Band 2: Obsidian ──────────────────── */}
        <SectionHeader
          source="obsidian"
          title="Obsidian 知识库"
          subtitle="PARA · ~/Desktop/文档/个人知识库/"
          right={
            <div style={{ display:'flex', gap: 6 }}>
              <button className="kb-btn ghost" style={{ fontSize: 12, color:'var(--src-obsidian)' }}><Icon name="inbox" size={12}/> 收件箱·7</button>
              <button className="kb-btn ghost" style={{ fontSize: 12, color:'var(--src-obsidian)' }}><Icon name="graph" size={12}/> MOC·14</button>
              <button className="kb-btn ghost" style={{ fontSize: 12, color:'var(--src-obsidian)' }}>防再犯</button>
            </div>
          }
        />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {[
            { name:"00-收件箱", files: 7, updated:"10 分钟前", summary:"临时入口 · 7 条待归档", highlight:"inbox" },
            { name:"10-Projects", files: 42, updated:"1 小时前", summary:"知识库看板、RAG Demo、周会 recap…", highlight:"folder-open" },
            { name:"20-Areas", files: 96, updated:"昨天", summary:"前端工程化、写作、个人财务…", highlight:"folder" },
            { name:"30-Resources", files: 218, updated:"2 天前", summary:"RAG 综述、Karpathy 课程、论文剪辑…", highlight:"folder" },
            { name:"90-MOC", files: 14, updated:"5 天前", summary:"学习方法、Agent 地图、工具链…", highlight:"graph" },
          ].map(c => (
            <div key={c.name} className="kb-card" style={{ padding: 14, display:'flex', flexDirection:'column', gap: 8 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background:'var(--src-obsidian-bg)', color:'var(--src-obsidian)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name={c.highlight} size={13}/>
                </div>
                <span className="kb-mono" style={{ fontSize: 12, color:'var(--ink)', fontWeight: 600 }}>{c.name}</span>
              </div>
              <div style={{ fontSize: 12.5, color:'var(--ink-sub)', lineHeight: 1.5, flex: 1, minHeight: 36 }}>{c.summary}</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color:'var(--ink-muted)', paddingTop: 6, borderTop:'1px solid var(--border)' }}>
                <span>{c.files} 文件</span>
                <span>{c.updated}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Band 3: 公司笔记 ──────────────────── */}
        <SectionHeader
          source="work"
          title="公司项目笔记"
          subtitle="~/work/code/sanwan/notes/"
          right={<button className="kb-btn ghost" style={{ fontSize: 12 }}><Icon name="terminal" size={12}/> 6 个活跃任务</button>}
        />
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 14 }}>
          {MOCK.work.projects.map(p => (
            <div key={p.id} className="kb-card" style={{ padding: 14, display:'flex', flexDirection:'column', gap: 10 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background:'var(--src-work-bg)', color:'var(--src-work)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon name="git" size={13}/>
                </div>
                <span className="kb-mono" style={{ fontSize: 12.5, color:'var(--ink)', fontWeight: 600, flex: 1 }}>{p.name}</span>
                {p.active > 0 && (
                  <span className="badge live" style={{ fontSize: 10 }}>
                    <span className="src-dot work"/> {p.active}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color:'var(--ink-sub)', lineHeight: 1.55 }}>
                {p.id === "iam" && "重构 token 刷新策略 · 最近提交 feat: 引入短 token"}
                {p.id === "gc-base-log" && "接入 OpenTelemetry · 补 migration 脚本笔记"}
                {p.id === "gc-cls" && "无活跃任务 · 季度复盘已归档"}
                {p.id === "message-center-all" && "消息推送重构 · codex 等待验收"}
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, color:'var(--ink-muted)', paddingTop: 8, borderTop:'1px solid var(--border)' }}>
                <span>md/codex · md/memory</span>
                <span>{p.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
};

window.HomePage = HomePage;
