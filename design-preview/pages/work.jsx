// Company notes page — projects tree (codex current/ highlighted)

const WorkPage = () => {
  return (
    <Frame active="work">
      <div style={{ flex:1, display:'flex', minHeight: 0 }}>
        {/* Left: projects */}
        <div style={{ width: 220, background:'var(--bg-tint)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'12px 12px 8px' }}>
            <SourcePill source="work"/>
            <div className="kb-serif" style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>公司项目笔记</div>
            <div className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>~/work/code/sanwan/notes/</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'8px 14px 4px' }}>项目</div>
          <div style={{ padding:'0 6px' }}>
            {[
              { n:'gc-base-log', active: 2 },
              { n:'gc-cls', active: 0 },
              { n:'iam', active: 3, selected: true },
              { n:'message-center-all', active: 1 },
            ].map(p => (
              <div key={p.n} className={`tree-row ${p.selected ? 'active-work' : ''}`} style={{ gap: 6, padding:'4px 8px' }}>
                <Icon name="git" size={12} color={p.selected ? 'var(--src-work)' : 'var(--ink-muted)'}/>
                <span className="kb-mono" style={{ fontSize: 12, flex: 1 }}>{p.n}</span>
                {p.active > 0 && <span style={{ width: 16, height: 16, borderRadius: 8, background:'var(--src-work)', color:'#fff', fontSize: 10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight: 600 }}>{p.active}</span>}
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'12px 14px 4px' }}>iam · 目录</div>
          <div className="kb-scroll" style={{ flex: 1, padding:'0 6px 10px', fontSize: 11.5 }}>
            <div className="tree-row" style={{ gap: 4, padding:'3px 8px' }}>
              <Icon name="chev-d" size={10} color="var(--ink-muted)"/>
              <Icon name="folder-open" size={11} color="var(--src-work)"/>
              <span className="kb-mono" style={{ flex: 1 }}>md</span>
            </div>
            <div className="tree-row" style={{ gap: 4, padding:'2px 8px 2px 22px' }}>
              <Icon name="chev-d" size={10} color="var(--ink-muted)"/>
              <Icon name="folder-open" size={11} color="var(--src-work)"/>
              <span className="kb-mono" style={{ flex: 1 }}>codex</span>
            </div>
            {/* Highlighted: current/ */}
            <div className="tree-row active-work" style={{ gap: 4, padding:'2px 8px 2px 36px', background:'var(--src-work-bg)', border:'1px solid #ECD9BF', borderRadius: 4 }}>
              <Icon name="terminal" size={11} color="var(--src-work)"/>
              <span className="kb-mono" style={{ flex: 1, fontWeight: 600 }}>current/</span>
              <span className="badge live" style={{ fontSize: 9.5, padding:'0 5px' }}>3 🚧</span>
            </div>
            {["token-refresh.md","sso-handoff.md","audit-log.md"].map(f => (
              <div key={f} className="tree-row" style={{ gap: 4, padding:'2px 8px 2px 50px', fontSize: 11 }}>
                <Icon name="file" size={10} color="var(--src-work)"/>
                <span className="kb-mono" style={{ flex: 1 }}>{f}</span>
              </div>
            ))}
            <div className="tree-row" style={{ gap: 4, padding:'2px 8px 2px 36px' }}>
              <Icon name="chev-r" size={10} color="var(--ink-muted)"/>
              <Icon name="folder" size={11} color="var(--ink-muted)"/>
              <span className="kb-mono" style={{ flex: 1, color:'var(--ink-muted)' }}>archive/</span>
              <span style={{ fontSize: 10, color:'var(--ink-muted)' }}>18</span>
            </div>
            <div className="tree-row" style={{ gap: 4, padding:'3px 8px 2px 22px' }}>
              <Icon name="chev-d" size={10} color="var(--ink-muted)"/>
              <Icon name="folder-open" size={11} color="var(--ink-muted)"/>
              <span className="kb-mono" style={{ flex: 1 }}>memory</span>
            </div>
            {["architecture.md","决策记录.md","常见问题.md"].map(f => (
              <div key={f} className="tree-row" style={{ gap: 4, padding:'2px 8px 2px 36px', fontSize: 11 }}>
                <Icon name="file" size={10} color="var(--ink-muted)"/>
                <span className="kb-mono" style={{ flex: 1 }}>{f}</span>
              </div>
            ))}
            <div className="tree-row" style={{ gap: 4, padding:'3px 8px 2px 22px' }}>
              <Icon name="file" size={11} color="var(--ink-muted)"/>
              <span className="kb-mono" style={{ flex: 1 }}>README.md</span>
            </div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0 }}>
          <div style={{ padding:'8px 22px', borderBottom:'1px solid var(--border)', background:'var(--bg-tint)', display:'flex', alignItems:'center', gap: 8, fontSize: 11.5, color:'var(--ink-sub)', fontFamily:'var(--font-mono)' }}>
            <span>iam</span>
            <Icon name="chev-r" size={10}/>
            <span>md/codex/current</span>
            <Icon name="chev-r" size={10}/>
            <span style={{ color:'var(--ink)' }}>token-refresh.md</span>
            <span className="badge live" style={{ marginLeft: 8, fontSize: 10 }}><span className="src-dot work"/> 活跃任务</span>
          </div>

          <div className="kb-scroll" style={{ flex: 1, padding:'28px 40px' }}>
            <div className="md" style={{ maxWidth: 740 }}>
              <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)', marginBottom: 6 }}>iam/md/codex/current/token-refresh.md</div>
              <h1>Token 刷新策略重构</h1>
              <div style={{ display:'flex', gap: 6, alignItems:'center', marginBottom: 18, fontSize: 12, color:'var(--ink-sub)' }}>
                <span className="badge live" style={{ fontSize: 11 }}>🚧 进行中</span>
                <span className="kb-mono" style={{ fontSize: 11 }}>codex · step 2/3</span>
                <span className="kb-mono" style={{ fontSize: 11 }}>owner: haolin</span>
              </div>

              <div className="callout warn">
                <div className="callout-title" style={{ color:'var(--warn)' }}>上下文</div>
                生产环境 token 30 天过期，用户反馈频繁重登。需要滑动刷新 + 短 token 双层。
              </div>

              <h2>子任务</h2>
              <ul style={{ listStyle:'none', padding: 0 }}>
                <li className="task"><span className="cb checked"/> <div><b>设计双 token 握手协议</b> · 文档已过 review</div></li>
                <li className="task"><span className="cb checked"/> <div><b>实现 AuthInterceptor 短 token 重放逻辑</b></div></li>
                <li className="task"><span className="cb"/> <div><b>补 e2e 测试 + 灰度名单</b> · 阻塞在 QA 环境</div></li>
              </ul>

              <h2>关键决策</h2>
              <pre><code><span className="tok-c">// 决策：refresh_token 绑定 device_id，单设备单活</span>{"\n"}<span className="tok-k">interface</span> <span className="tok-f">RefreshPayload</span> {'{'}{"\n"}  access_token: <span className="tok-k">string</span>;  <span className="tok-c">// 15 min</span>{"\n"}  refresh_token: <span className="tok-k">string</span>; <span className="tok-c">// 30 day, rotating</span>{"\n"}  device_id: <span className="tok-k">string</span>;{"\n"}{'}'}</code></pre>

              <h2>流程</h2>
              <div className="mermaid-box">
                <svg width="520" height="130" viewBox="0 0 520 130">
                  {[
                    {x:20, l:'Client'}, {x:150, l:'Gateway'}, {x:280, l:'Auth Svc'}, {x:410, l:'Redis'}
                  ].map(n => (
                    <g key={n.l}>
                      <rect x={n.x} y="50" width="90" height="30" rx="6" fill="var(--bg-sunk)" stroke="var(--border-strong)"/>
                      <text x={n.x+45} y="69" fontSize="11" textAnchor="middle" fontFamily="var(--font-mono)" fill="var(--ink)">{n.l}</text>
                    </g>
                  ))}
                  <path d="M110 65 L150 65" stroke="var(--src-work)" strokeWidth="1.5" markerEnd="url(#aw)"/>
                  <path d="M240 65 L280 65" stroke="var(--src-work)" strokeWidth="1.5" markerEnd="url(#aw)"/>
                  <path d="M370 65 L410 65" stroke="var(--src-work)" strokeWidth="1.5" markerEnd="url(#aw)"/>
                  <text x="130" y="58" fontSize="9" textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)">refresh</text>
                  <text x="260" y="58" fontSize="9" textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)">verify</text>
                  <text x="390" y="58" fontSize="9" textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)">rotate</text>
                  <defs>
                    <marker id="aw" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <path d="M0 0 L6 3 L0 6 z" fill="var(--src-work)"/>
                    </marker>
                  </defs>
                </svg>
              </div>

              <h2>相关 memory</h2>
              <ul>
                <li><code>memory/architecture.md</code> — 整体鉴权拓扑</li>
                <li><code>memory/决策记录.md#2026-03-12</code> — 引入短 token 的讨论</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right: active tasks aggregate */}
        <div style={{ width: 260, background:'var(--bg-tint)', borderLeft:'1px solid var(--border)', padding: 14, display:'flex', flexDirection:'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 8 }}>全部活跃任务 · 6</div>
            {[
              { p:'iam', f:'token-refresh.md', s:'step 2/3', active: true },
              { p:'iam', f:'sso-handoff.md', s:'step 1/2' },
              { p:'iam', f:'audit-log.md', s:'draft' },
              { p:'gc-base-log', f:'otel-adoption.md', s:'step 3/4' },
              { p:'gc-base-log', f:'migration-v2.md', s:'review' },
              { p:'message-center-all', f:'push-rewrite.md', s:'qa' },
            ].map((t, i) => (
              <div key={i} className="kb-card" style={{
                padding: 10, marginBottom: 6,
                borderColor: t.active ? 'var(--src-work)' : 'var(--border)',
                borderWidth: t.active ? 1.5 : 1,
                background: t.active ? 'var(--bg-raised)' : 'transparent',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 3 }}>
                  <span className="src-dot work"/>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--src-work)', fontWeight: 600 }}>{t.p}</span>
                  <span style={{ marginLeft:'auto', fontSize: 10, color:'var(--ink-muted)' }}>{t.s}</span>
                </div>
                <div className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink)' }}>{t.f}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.WorkPage = WorkPage;
