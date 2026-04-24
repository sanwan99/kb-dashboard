// Home alt B — Dashboard layout (hero breakpoint + stats + activity feed)

const HomeDashboard = () => {
  return (
    <Frame active="home">
      <div className="kb-scroll" style={{ flex:1, padding:'20px 24px 24px', display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 18 }}>
        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
          {/* Hero */}
          <div className="kb-card" style={{ padding: 22, background:'var(--bg-raised)', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', inset: 0, background:'linear-gradient(135deg, transparent 60%, var(--src-learn-bg) 100%)' }}/>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
                <SourcePill source="learn"/>
                <span className="badge live"><span className="src-dot" style={{background:'var(--src-learn)'}}/> 当前断点</span>
                <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)' }}>昨天 22:14</span>
              </div>
              <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', marginBottom: 4 }}>knowledge/18-function-calling-strict-mode.md</div>
              <h1 className="kb-serif" style={{ margin:'0 0 8px', fontSize: 26, fontWeight: 600, letterSpacing:'-0.02em' }}>
                §4 JSON Schema 严格模式的 edge cases
              </h1>
              <div style={{ fontSize: 14, color:'var(--ink-sub)', lineHeight: 1.6, marginBottom: 18, maxWidth: 580 }}>
                下一节：<b style={{color:'var(--ink)'}}>嵌套对象与 oneOf 的互斥失效</b>。上次学习时间 32 分钟，完成了 3 个小节。
              </div>
              <div style={{ display:'flex', gap: 8, marginBottom: 18 }}>
                <button className="kb-btn primary" style={{ height: 36, padding:'0 16px' }}><Icon name="play" size={14}/> 从断点继续</button>
                <button className="kb-btn" style={{ height: 36 }}>查看进度表</button>
                <button className="kb-btn ghost" style={{ height: 36 }}>切换专题</button>
              </div>
              {/* Stages */}
              <div>
                <div style={{ display:'flex', gap: 4, marginBottom: 6 }}>
                  {["基础认知","Prompting","Tool Use","Memory & RAG","Agents"].map((s,i) => (
                    <div key={s} style={{ flex: 1, height: 4, borderRadius: 2,
                      background: i < 2 ? 'var(--src-learn)' : i===2 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)',
                      position:'relative', overflow:'hidden'
                    }}>
                      {i===2 && <div style={{ position:'absolute', inset:0, width:'44%', background:'var(--src-learn)' }}/>}
                    </div>
                  ))}
                </div>
                <div style={{ display:'flex', gap: 4, fontSize: 11, color:'var(--ink-muted)' }}>
                  {["基础认知","Prompting","Tool Use","Memory & RAG","Agents"].map((s,i) => (
                    <div key={s} style={{ flex: 1, color: i<=2 ? 'var(--ink-sub)' : 'var(--ink-muted)', fontWeight: i===2 ? 600 : 400 }}>{s}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity timeline */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
              <Icon name="clock" size={14}/>
              <b style={{ fontSize: 13 }}>最近活动</b>
              <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>过去 48 小时</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 0, position:'relative' }}>
              {[
                { src:'learn', time:'22:14', date:'昨天', t:'学习', f:'18-function-calling-strict-mode.md', d:'记录断点 · 32 分钟' },
                { src:'obsidian', time:'20:02', date:'昨天', t:'编辑', f:'10-Projects/知识库看板.md', d:'新增 4 条反链' },
                { src:'work', time:'18:47', date:'昨天', t:'codex', f:'iam/md/codex/current/token-refresh.md', d:'标记完成 2 / 3 子任务' },
                { src:'obsidian', time:'11:30', date:'昨天', t:'新建', f:'00-收件箱/周会-20260422.md' },
                { src:'learn', time:'23:05', date:'前天', t:'复习', f:'review/prompting/_当前进度.md', d:'完成 5 / 5 卡片' },
              ].map((it, i) => (
                <div key={i} style={{ display:'flex', gap: 12, padding:'10px 0', borderTop: i>0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="kb-mono" style={{ width: 78, fontSize: 11, color:'var(--ink-muted)', paddingTop: 2 }}>
                    <div>{it.date}</div>
                    <div>{it.time}</div>
                  </div>
                  <span className={`src-dot ${it.src}`} style={{ marginTop: 6 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color:'var(--ink)' }}>
                      <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', marginRight: 6 }}>{it.t}</span>
                      {it.f}
                    </div>
                    {it.d && <div style={{ fontSize: 12, color:'var(--ink-sub)', marginTop: 2 }}>{it.d}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: stats stack */}
        <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
          {/* Three-source ring */}
          <div className="kb-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 10 }}>三个源概览</div>
            {[
              { src:'learn', name:'AI Agent 学习', v:'阶段 3/5', detail:'进度 44%', files:47 },
              { src:'obsidian', name:'个人知识库', v:'PARA', detail:'反链 1,240', files:482 },
              { src:'work', name:'公司笔记', v:'4 项目', detail:'6 个活跃任务', files:12 },
            ].map(r => (
              <div key={r.src} style={{ display:'flex', alignItems:'center', gap: 10, padding:'10px 0', borderTop:'1px solid var(--border)' }}>
                <span className={`src-dot ${r.src}`} style={{ width: 10, height: 10 }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color:'var(--ink-muted)' }}>{r.v} · {r.detail}</div>
                </div>
                <span className="kb-mono" style={{ fontSize: 12, color:'var(--ink-sub)' }}>{r.files}</span>
              </div>
            ))}
          </div>

          {/* Streak grid */}
          <div className="kb-card" style={{ padding: 16 }}>
            <div style={{ display:'flex', alignItems:'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>学习连续</div>
                <div style={{ display:'flex', alignItems:'baseline', gap: 4 }}>
                  <span className="kb-serif" style={{ fontSize: 30, fontWeight: 600 }}>12</span>
                  <span style={{ fontSize: 12, color:'var(--ink-sub)' }}>天 · 最长 23</span>
                </div>
              </div>
              <div style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>近 5 周</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(35, 1fr)', gap: 2 }}>
              {Array.from({length: 35}).map((_,i) => {
                const v = [0,0.3,1,1,0.6,0,1][i%7] * (0.3 + Math.random()*0.7);
                return <div key={i} style={{ aspectRatio:'1', borderRadius: 2, background: v>0.6 ? 'var(--src-learn)' : v>0.3 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)' }}/>;
              })}
            </div>
          </div>

          {/* Inbox + due */}
          <div className="kb-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 10 }}>需要注意</div>
            {[
              { icon:'inbox', src:'obsidian', t:'收件箱', d:'7 条待归档', urg:'' },
              { icon:'clock', src:'learn', t:'复习逾期', d:'react-loop · 1 天', urg:'danger' },
              { icon:'terminal', src:'work', t:'活跃任务', d:'iam · 3 个 codex', urg:'' },
              { icon:'flag', src:'obsidian', t:'防再犯', d:'新增 1 条', urg:'' },
            ].map((r,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'8px 0', borderTop: i>0 ? '1px solid var(--border)' : 'none' }}>
                <Icon name={r.icon} size={14} color={`var(--src-${r.src})`}/>
                <span style={{ fontSize: 13, flex: 1 }}>{r.t}</span>
                <span style={{ fontSize: 12, color: r.urg==='danger' ? 'var(--danger)' : 'var(--ink-muted)' }}>{r.d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.HomeDashboard = HomeDashboard;
