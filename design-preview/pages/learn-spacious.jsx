// Learning project page — 呼吸感版 (spacious)

const LearnPageSpacious = () => {
  const activeFile = "review/prompting/_当前进度.md";
  return (
    <Frame active="learn">
      <div style={{ flex:1, display:'flex', minHeight: 0 }}>
        {/* Sidebar */}
        <div style={{ width: 260, background:'var(--bg-tint)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 14px 8px' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
              <SourcePill source="learn"/>
            </div>
            <div className="kb-serif" style={{ fontSize: 15, fontWeight: 600 }}>AI Agent 学习项目</div>
            <div className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>~/个人学习项目/</div>
          </div>
          <div style={{ display:'flex', gap: 2, padding:'0 10px', marginBottom: 6 }}>
            {["knowledge","review"].map((t,i) => (
              <button key={t} className="kb-btn ghost" style={{
                flex: 1, height: 26, fontSize: 12,
                background: i===1 ? 'var(--bg-raised)' : 'transparent',
                border: i===1 ? '1px solid var(--border)' : '1px solid transparent',
                color: i===1 ? 'var(--src-learn)' : 'var(--ink-sub)',
                fontWeight: i===1 ? 600 : 400,
              }}>{t}</button>
            ))}
          </div>
          <div className="kb-scroll" style={{ flex: 1, padding:'4px 8px 10px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'8px 8px 4px' }}>复习专题</div>
            {[
              { n:'prompting', due:'今天', active: true },
              { n:'embeddings', due:'2d' },
              { n:'react-loop', due:'逾期', overdue: true },
              { n:'tool-use', due:'5d' },
              { n:'evaluation', due:'—' },
            ].map(t => (
              <div key={t.n} className={`tree-row ${t.active ? 'active-learn':''}`} style={{ fontFamily:'var(--font-mono)' }}>
                <Icon name="folder" size={12}/>
                <span style={{ flex: 1 }}>{t.n}</span>
                <span style={{ fontSize: 10, color: t.overdue ? 'var(--danger)' : 'var(--ink-muted)' }}>{t.due}</span>
              </div>
            ))}
            <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'12px 8px 4px' }}>当前专题 · prompting</div>
            {[
              { i:'file', n:'_章节材料.md', m:'12k' },
              { i:'file', n:'_当前计划.md', m:'4k' },
              { i:'file', n:'_当前进度.md', m:'6k', active: true },
              { i:'file', n:'_纠错补充.md', m:'2k' },
              { i:'file', n:'_学习记录.md', m:'8k' },
            ].map(f => (
              <div key={f.n} className={`tree-row ${f.active ? 'active-learn':''}`} style={{ paddingLeft: 16, fontFamily:'var(--font-mono)' }}>
                <Icon name="file" size={11}/>
                <span style={{ flex: 1, fontSize: 12 }}>{f.n}</span>
                <span style={{ fontSize: 10, color:'var(--ink-muted)' }}>{f.m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0 }}>
          {/* Stage progress bar */}
          <div style={{ padding:'18px 32px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>五阶段学习路径</span>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>progress.md</span>
              <span style={{ marginLeft:'auto', fontSize: 12, color:'var(--ink-sub)' }}>总进度 <b style={{color:'var(--src-learn)'}}>44%</b></span>
            </div>
            <div style={{ display:'flex', gap: 6 }}>
              {["基础认知","Prompting 与结构化","Tool Use 与函数调用","Memory & RAG","Agents"].map((s,i) => {
                const done = i < 2;
                const active = i === 2;
                return (
                  <div key={s} style={{ flex: 1 }}>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--bg-sunk)', overflow:'hidden', marginBottom: 6 }}>
                      <div style={{ height:'100%', width: done ? '100%' : active ? '44%' : '0%', background:'var(--src-learn)' }}/>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color:'var(--ink-muted)' }}>0{i+1}</span>
                      <span style={{ fontSize: 12.5, color: active ? 'var(--ink)' : done ? 'var(--ink-sub)' : 'var(--ink-muted)', fontWeight: active ? 600 : 400 }}>{s}</span>
                      {done && <Icon name="check" size={11} color="var(--ok)"/>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakpoint hero */}
          <div style={{ padding:'22px 32px 8px' }}>
            <div className="kb-card" style={{ padding: 20, background:'linear-gradient(135deg, var(--bg-raised) 0%, var(--src-learn-bg) 140%)', borderColor:'#D8E3F5' }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 8 }}>
                <span className="badge live" style={{ background:'var(--src-learn-bg)', color:'var(--src-learn)', borderColor:'#D8E3F5' }}>
                  <span className="src-dot learn"/> 当前断点
                </span>
                <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>knowledge/18-function-calling-strict-mode.md · 昨天 22:14</span>
              </div>
              <h2 className="kb-serif" style={{ margin:'0 0 6px', fontSize: 22, fontWeight: 600, letterSpacing:'-0.015em' }}>§4 JSON Schema 严格模式的 edge cases</h2>
              <div style={{ fontSize: 13.5, color:'var(--ink-sub)', lineHeight: 1.6, marginBottom: 14, maxWidth: 640 }}>
                上次学习 32 分钟，完成 3 个小节。下一节：<b style={{color:'var(--ink)'}}>嵌套对象与 oneOf 的互斥失效</b>。
              </div>
              <div style={{ display:'flex', gap: 8 }}>
                <button className="kb-btn primary" style={{ height: 32 }}><Icon name="play" size={13}/> 从断点继续</button>
                <button className="kb-btn" style={{ height: 32 }}>新学习记录</button>
                <button className="kb-btn ghost" style={{ height: 32 }}>切换专题</button>
              </div>
            </div>
          </div>

          {/* Review tabs */}
          <div style={{ padding:'8px 32px 0' }}>
            <div style={{ display:'flex', alignItems:'flex-end', gap: 4, borderBottom:'1px solid var(--border)' }}>
              {[
                { n:'章节材料', f:'_章节材料.md' },
                { n:'当前计划', f:'_当前计划.md' },
                { n:'当前进度', f:'_当前进度.md', active: true },
                { n:'纠错补充', f:'_纠错补充.md' },
                { n:'学习记录', f:'_学习记录.md' },
              ].map(t => (
                <button key={t.n} className="kb-btn ghost" style={{
                  height: 34, padding:'0 14px',
                  borderRadius: 0,
                  borderBottom: t.active ? '2px solid var(--src-learn)' : '2px solid transparent',
                  color: t.active ? 'var(--src-learn)' : 'var(--ink-sub)',
                  fontWeight: t.active ? 600 : 400,
                  fontSize: 13,
                }}>{t.n}</button>
              ))}
              <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)', paddingBottom: 8 }}>review/prompting/</span>
            </div>
          </div>

          {/* Content */}
          <div className="kb-scroll" style={{ flex: 1, padding:'24px 32px 32px' }}>
            <div className="md">
              <h1>prompting · 当前进度</h1>
              <div className="callout tip">
                <div className="callout-title">小目标</div>
                本周完成 5 个核心卡片的背诵与复写，第 6 天综合复盘。
              </div>
              <h2>已完成</h2>
              <ul className="kb-task-list" style={{ listStyle:'none', padding: 0 }}>
                <li className="task"><span className="cb checked"/> <div><b>01 · 零-shot vs few-shot 的边界</b> <span className="muted kb-mono" style={{ fontSize: 11 }}>· 4月 18</span></div></li>
                <li className="task"><span className="cb checked"/> <div><b>02 · CoT 的有效与无效情景</b> <span className="muted kb-mono" style={{ fontSize: 11 }}>· 4月 19</span></div></li>
                <li className="task"><span className="cb checked"/> <div><b>03 · Structured output: JSON 模式</b> <span className="muted kb-mono" style={{ fontSize: 11 }}>· 4月 21</span></div></li>
              </ul>
              <h2>今天</h2>
              <ul className="kb-task-list" style={{ listStyle:'none', padding: 0 }}>
                <li className="task"><span className="cb"/> <div>04 · Prompt injection 的典型向量</div></li>
                <li className="task"><span className="cb"/> <div>05 · 综合复写：把 02 和 04 合起来写一个 <span className="wikilink">[[代理骨架]]</span></div></li>
              </ul>
              <h2>代码示例</h2>
              <pre><code><span className="tok-k">function</span> <span className="tok-f">askModel</span>(<span className="tok-n">prompt</span>) {'{'}
  <span className="tok-k">return</span> fetch(<span className="tok-s">'/v1/messages'</span>, {'{'}
    method: <span className="tok-s">'POST'</span>,
    body: JSON.<span className="tok-f">stringify</span>({'{'} prompt, max_tokens: <span className="tok-n">1024</span> {'}'})
  {'}'});
{'}'}</code></pre>
            </div>
          </div>
        </div>

        {/* Right: session notes */}
        <div style={{ width: 280, background:'var(--bg-tint)', borderLeft:'1px solid var(--border)', padding: 16, display:'flex', flexDirection:'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>今日学习</div>
            <div className="kb-card" style={{ padding: 12 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap: 4 }}>
                <span className="kb-serif" style={{ fontSize: 26, fontWeight: 600 }}>12</span>
                <span style={{ fontSize: 12, color:'var(--ink-sub)' }}>天连续</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(14,1fr)', gap: 2, marginTop: 8 }}>
                {Array.from({length:14}).map((_,i) => {
                  const v = [1,1,0.4,1,0,1,1][i%7];
                  return <div key={i} style={{ aspectRatio:'1', borderRadius: 2, background: v>=1 ? 'var(--src-learn)' : v>0 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)' }}/>;
                })}
              </div>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>复习队列</div>
            <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
              {[
                { n:'prompting', due:'今天 · 5', active: true },
                { n:'embeddings', due:'2 天后 · 5' },
                { n:'react-loop', due:'逾期 1 天 · 5', overdue: true },
              ].map(t => (
                <div key={t.n} className="kb-card" style={{
                  padding:'8px 10px', fontSize: 12,
                  background: t.active ? 'var(--bg-raised)' : 'transparent',
                  borderColor: t.active ? 'var(--src-learn)' : 'var(--border)',
                  borderWidth: t.active ? 1.5 : 1,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                    <span className="kb-mono" style={{ fontWeight: 600, flex: 1 }}>{t.n}</span>
                    <span style={{ fontSize: 11, color: t.overdue ? 'var(--danger)' : 'var(--ink-muted)' }}>{t.due}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>断点备忘</div>
            <div className="kb-card" style={{ padding: 12, fontSize: 12, color:'var(--ink-sub)', lineHeight: 1.55 }}>
              <div className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)', marginBottom: 4 }}>progress.md : L42</div>
              "strict mode 下，如果 schema 用了 oneOf 但没加 discriminator，模型会回退到第一个分支"
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.LearnPageSpacious = LearnPageSpacious;
