// Learning project page — 紧凑版 (dense, IDE-like)

const LearnPageCompact = () => {
  return (
    <Frame active="learn">
      <div style={{ flex:1, display:'flex', minHeight: 0, fontSize: 12.5 }}>
        {/* Sidebar */}
        <div style={{ width: 220, background:'var(--bg-tint)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', fontSize: 12 }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 6 }}>
            <span className="src-dot learn"/>
            <b className="kb-mono" style={{ fontSize: 11.5 }}>ai-agent-learning</b>
            <Icon name="chev-d" size={11} color="var(--ink-muted)" style={{marginLeft:'auto'}}/>
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
            {["knowledge","review","progress"].map((t,i) => (
              <button key={t} className="kb-btn ghost" style={{
                flex: 1, height: 26, fontSize: 11, borderRadius: 0,
                background: i===1 ? 'var(--bg-raised)' : 'transparent',
                color: i===1 ? 'var(--src-learn)' : 'var(--ink-sub)',
                borderBottom: i===1 ? '2px solid var(--src-learn)' : 'none',
                fontWeight: i===1 ? 600 : 400,
              }}>{t}</button>
            ))}
          </div>
          <div className="kb-scroll" style={{ flex: 1, padding: '4px 6px', fontFamily:'var(--font-mono)', fontSize: 11.5 }}>
            {[
              { t:'folder-open', n:'prompting', d:'due', active:true, children:[
                { t:'file', n:'_章节材料.md' },
                { t:'file', n:'_当前计划.md' },
                { t:'file', n:'_当前进度.md', active:true },
                { t:'file', n:'_纠错补充.md' },
                { t:'file', n:'_学习记录.md' },
              ]},
              { t:'folder', n:'embeddings' },
              { t:'folder', n:'react-loop', overdue:true },
              { t:'folder', n:'tool-use' },
              { t:'folder', n:'evaluation' },
              { t:'folder', n:'memory' },
            ].map(it => (
              <React.Fragment key={it.n}>
                <div className={`tree-row ${it.active && !it.children ? 'active-learn' : ''}`} style={{
                  padding:'2px 4px', fontSize: 11.5, gap: 4,
                  color: it.overdue ? 'var(--danger)' : undefined,
                }}>
                  <Icon name={it.t} size={11} color={it.active && !it.children ? undefined : 'var(--ink-muted)'}/>
                  <span style={{ flex: 1 }}>{it.n}</span>
                  {it.d && <span style={{ fontSize: 9.5, color:'var(--src-learn)' }}>●</span>}
                  {it.overdue && <span style={{ fontSize: 9.5 }}>!</span>}
                </div>
                {it.children && it.children.map(c => (
                  <div key={c.n} className={`tree-row ${c.active ? 'active-learn' : ''}`} style={{ padding:'2px 4px 2px 18px', fontSize: 11.5, gap: 4 }}>
                    <Icon name={c.t} size={10} color={c.active ? undefined : 'var(--ink-muted)'}/>
                    <span>{c.n}</span>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
          <div style={{ borderTop:'1px solid var(--border)', padding:'6px 8px', fontSize: 10.5, color:'var(--ink-muted)', fontFamily:'var(--font-mono)' }}>
            62 files · 4.2MB
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0 }}>
          {/* Thin stage strip */}
          <div style={{ padding:'6px 14px', background:'var(--bg-tint)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 10 }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>stages</span>
            <div style={{ display:'flex', gap: 3, flex: 1 }}>
              {["基础","Prompting","Tool Use","Memory","Agents"].map((s,i) => {
                const done = i<2, active = i===2;
                return (
                  <div key={s} title={s} style={{ flex: 1, display:'flex', alignItems:'center', gap: 4, padding:'3px 6px', borderRadius: 3, background: active ? 'var(--src-learn-bg)' : 'transparent', border:'1px solid', borderColor: active ? '#D8E3F5' : 'transparent' }}>
                    {done ? <Icon name="check" size={10} color="var(--ok)"/> : active ? <span style={{ width:6, height:6, borderRadius:3, background:'var(--src-learn)' }}/> : <span style={{ width:6, height:6, borderRadius:3, background:'var(--ink-faint)' }}/>}
                    <span style={{ fontSize: 11, color: active ? 'var(--ink)' : done ? 'var(--ink-sub)' : 'var(--ink-muted)', fontWeight: active ? 600 : 400 }}>{s}</span>
                  </div>
                );
              })}
            </div>
            <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>44%</span>
          </div>

          {/* Breakpoint bar */}
          <div style={{ padding:'10px 14px', background:'var(--src-learn-bg)', borderBottom:'1px solid #D8E3F5', display:'flex', alignItems:'center', gap: 10 }}>
            <span className="badge live" style={{ background:'var(--bg-raised)', color:'var(--src-learn)', borderColor:'#D8E3F5' }}>
              <span className="src-dot learn"/> 断点
            </span>
            <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-sub)' }}>knowledge/18-function-calling-strict-mode.md</span>
            <span style={{ fontSize: 12, color:'var(--ink)' }}>§4 JSON Schema 严格模式的 edge cases</span>
            <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)' }}>昨天 22:14</span>
            <button className="kb-btn primary" style={{ height: 26, padding:'0 10px', fontSize: 11.5 }}><Icon name="play" size={11}/> 继续</button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg-tint)', height: 28 }}>
            {[
              { n:'章节材料', f:'_章节材料.md' },
              { n:'当前计划', f:'_当前计划.md' },
              { n:'当前进度', f:'_当前进度.md', active:true },
              { n:'纠错补充', f:'_纠错补充.md' },
              { n:'学习记录', f:'_学习记录.md' },
            ].map(t => (
              <div key={t.n} style={{
                display:'flex', alignItems:'center', gap: 6, padding:'0 12px',
                fontSize: 11.5, color: t.active ? 'var(--ink)' : 'var(--ink-sub)',
                background: t.active ? 'var(--bg)' : 'transparent',
                borderRight:'1px solid var(--border)',
                borderBottom: t.active ? '2px solid var(--src-learn)' : '2px solid transparent',
                fontFamily:'var(--font-mono)',
              }}>
                <Icon name="file" size={10} color={t.active ? 'var(--src-learn)' : 'var(--ink-muted)'}/>
                {t.f}
              </div>
            ))}
          </div>

          {/* Dense 2-pane: content + metadata */}
          <div style={{ flex: 1, display:'flex', minHeight: 0 }}>
            <div className="kb-scroll" style={{ flex: 1, padding:'14px 20px', borderRight:'1px solid var(--border)' }}>
              <div className="md" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
                <h1 style={{ fontSize: 22 }}>prompting · 当前进度</h1>
                <div className="callout tip" style={{ padding:'8px 12px', fontSize: 12.5, margin:'0 0 10px' }}>
                  <div className="callout-title" style={{ marginBottom: 2 }}>目标</div>
                  本周完成 5 个核心卡片背诵，第 6 天综合复盘。
                </div>
                <h3 style={{ fontSize: 14, margin:'12px 0 6px' }}>已完成</h3>
                <ul style={{ listStyle:'none', padding: 0, margin: 0 }}>
                  <li className="task" style={{ margin:'3px 0' }}><span className="cb checked"/> 01 零-shot vs few-shot <span className="muted kb-mono" style={{fontSize:10.5}}>· 4/18</span></li>
                  <li className="task" style={{ margin:'3px 0' }}><span className="cb checked"/> 02 CoT 有效与无效 <span className="muted kb-mono" style={{fontSize:10.5}}>· 4/19</span></li>
                  <li className="task" style={{ margin:'3px 0' }}><span className="cb checked"/> 03 Structured output: JSON <span className="muted kb-mono" style={{fontSize:10.5}}>· 4/21</span></li>
                </ul>
                <h3 style={{ fontSize: 14, margin:'12px 0 6px' }}>今天</h3>
                <ul style={{ listStyle:'none', padding: 0, margin: 0 }}>
                  <li className="task" style={{ margin:'3px 0' }}><span className="cb"/> 04 Prompt injection 典型向量</li>
                  <li className="task" style={{ margin:'3px 0' }}><span className="cb"/> 05 综合复写 → <span className="wikilink">[[代理骨架]]</span></li>
                </ul>
                <h3 style={{ fontSize: 14, margin:'12px 0 6px' }}>代码片段</h3>
                <pre style={{ fontSize: 11.5, padding:'10px 12px' }}><code><span className="tok-c">// review/prompting/snippets.ts</span>{"\n"}<span className="tok-k">function</span> <span className="tok-f">askModel</span>(<span className="tok-n">p</span>: <span className="tok-k">string</span>) {'{'}{"\n"}  <span className="tok-k">return</span> fetch(<span className="tok-s">'/v1/messages'</span>, {'{'} body: p {'}'});{"\n"}{'}'}</code></pre>
              </div>
            </div>
            <div style={{ width: 240, background:'var(--bg-tint)', padding: 12, display:'flex', flexDirection:'column', gap: 10, fontSize: 11.5 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 4 }}>文件元</div>
                <div className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-sub)', lineHeight: 1.5 }}>
                  <div>size: 6.2 KB · 182 行</div>
                  <div>mtime: 2026-04-22 22:14</div>
                  <div>5 wikilink · 0 embed</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 4 }}>复习队列</div>
                {[
                  { n:'prompting', due:'今 · 5', active:true },
                  { n:'embeddings', due:'+2d · 5' },
                  { n:'react-loop', due:'-1d · 5', overdue:true },
                ].map(t => (
                  <div key={t.n} style={{ display:'flex', gap: 4, padding:'3px 0', fontFamily:'var(--font-mono)', fontSize: 11 }}>
                    <span style={{ flex: 1, color: t.active ? 'var(--src-learn)' : 'var(--ink-sub)', fontWeight: t.active ? 600 : 400 }}>{t.n}</span>
                    <span style={{ fontSize: 10.5, color: t.overdue ? 'var(--danger)' : 'var(--ink-muted)' }}>{t.due}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 4 }}>连续 · 12 天</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(14,1fr)', gap: 2 }}>
                  {Array.from({length:28}).map((_,i) => {
                    const v = [1,1,0.3,1,0,1,1,0.6,1,1,0,1,1,1][i%14];
                    return <div key={i} style={{ aspectRatio:'1', borderRadius: 2, background: v>=1 ? 'var(--src-learn)' : v>0 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)' }}/>;
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ height: 22, background:'var(--src-learn)', color:'#fff', display:'flex', alignItems:'center', padding:'0 12px', fontSize: 10.5, gap: 14, fontFamily:'var(--font-mono)' }}>
            <span>● 断点已保存</span>
            <span>prompting 专题 · 3 / 5</span>
            <span style={{ marginLeft:'auto' }}>UTF-8</span>
            <span>markdown</span>
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.LearnPageCompact = LearnPageCompact;
