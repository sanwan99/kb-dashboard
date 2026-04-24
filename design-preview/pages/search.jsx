// Search results page — cross-source full-text search

const SearchPage = () => {
  return (
    <Frame active="home" search="JSON schema">
      <div style={{ flex:1, display:'flex', minHeight: 0 }}>
        {/* Left: filters */}
        <div style={{ width: 220, padding:'18px 16px', borderRight:'1px solid var(--border)', background:'var(--bg-tint)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color:'var(--ink-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom: 10 }}>过滤</div>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', marginBottom: 6 }}>来源</div>
          {[
            { src:'learn', n:'学习项目', c: 8, on: true },
            { src:'obsidian', n:'Obsidian', c: 14, on: true },
            { src:'work', n:'公司项目', c: 3, on: true },
          ].map(r => (
            <div key={r.src} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 0' }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: r.on ? `var(--src-${r.src})` : 'var(--bg-sunk)', border: '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {r.on && <Icon name="check" size={10} color="#fff"/>}
              </span>
              <span style={{ fontSize: 12.5, flex: 1 }}>{r.n}</span>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>{r.c}</span>
            </div>
          ))}

          <div style={{ fontSize: 11, color:'var(--ink-muted)', margin:'14px 0 6px' }}>文件类型</div>
          {[{n:'Markdown', c:24, on:true}, {n:'图片', c:3}, {n:'代码块', c:11}].map(r => (
            <div key={r.n} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 0' }}>
              <span style={{ width: 14, height: 14, borderRadius: 3, background: r.on ? 'var(--ink)' : 'var(--bg-sunk)', border: '1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {r.on && <Icon name="check" size={10} color="#fff"/>}
              </span>
              <span style={{ fontSize: 12.5, flex: 1 }}>{r.n}</span>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>{r.c}</span>
            </div>
          ))}

          <div style={{ fontSize: 11, color:'var(--ink-muted)', margin:'14px 0 6px' }}>时间</div>
          {["今天","过去 7 天","过去 30 天","全部"].map((t,i) => (
            <div key={t} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 0' }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, border:'1.5px solid var(--border-strong)', background: i===3 ? 'var(--ink)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                {i===3 && <span style={{ width: 5, height: 5, borderRadius: 3, background:'#fff' }}/>}
              </span>
              <span style={{ fontSize: 12.5, flex: 1, color: i===3 ? 'var(--ink)' : 'var(--ink-sub)' }}>{t}</span>
            </div>
          ))}
        </div>

        {/* Main results */}
        <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0 }}>
          <div style={{ padding:'16px 24px 8px' }}>
            <div style={{ fontSize: 11, color:'var(--ink-muted)', fontFamily:'var(--font-mono)', marginBottom: 4 }}>query · 0.08s</div>
            <h1 className="kb-serif" style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing:'-0.015em' }}>
              <span style={{ color:'var(--ink-sub)' }}>"</span>JSON schema<span style={{ color:'var(--ink-sub)' }}>"</span> · 25 个匹配
            </h1>
            <div style={{ display:'flex', alignItems:'center', gap: 14, marginTop: 10, fontSize: 12 }}>
              <span><span className="src-dot learn"/> 学习 <b>8</b></span>
              <span><span className="src-dot obsidian"/> Obsidian <b>14</b></span>
              <span><span className="src-dot work"/> 公司 <b>3</b></span>
              <div style={{ marginLeft:'auto', display:'flex', gap: 6 }}>
                <button className="kb-btn ghost" style={{ height: 26, fontSize: 11.5 }}><Icon name="filter" size={11}/> 排序：相关度</button>
              </div>
            </div>
          </div>

          <div className="kb-scroll" style={{ flex: 1, padding:'10px 24px 24px' }}>
            {/* Group: 学习项目 */}
            <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'14px 0 8px', borderTop:'1px solid var(--border)' }}>
              <SourcePill source="learn"/>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>ai-agent-learning</span>
              <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>8 matches</span>
            </div>
            {[
              { f:'knowledge/18-function-calling-strict-mode.md', loc:'§4 · line 42', q:'strict 模式下，<mark>JSON Schema</mark> 如果用了 oneOf 但没加 discriminator，模型会回退…', t:'昨天 22:14' },
              { f:'knowledge/19-structured-output.md', loc:'§2 · line 17', q:'配合 <mark>JSON schema</mark>，可以把 LLM 的输出限制在一个固定的数据形状里…', t:'3 天前' },
              { f:'review/prompting/_纠错补充.md', loc:'line 8', q:'常见错误：写 <mark>JSON schema</mark> 时混用 required 与 properties…', t:'4 天前' },
            ].map((r, i) => (
              <div key={i} className="kb-card" style={{ padding:'10px 14px', marginBottom: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Icon name="file" size={12} color="var(--src-learn)"/>
                  <span className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink)', fontWeight: 600 }}>{r.f}</span>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>· {r.loc}</span>
                  <span style={{ marginLeft:'auto', fontSize: 10.5, color:'var(--ink-muted)' }}>{r.t}</span>
                </div>
                <div style={{ fontSize: 12.5, color:'var(--ink-sub)', marginTop: 4, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: r.q.replace(/<mark>/g,'<span style="background:#F6E6A8;color:#5a4a2a;padding:0 3px;border-radius:2px;">').replace(/<\/mark>/g,'</span>') }}/>
              </div>
            ))}

            {/* Group: Obsidian */}
            <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'18px 0 8px', borderTop:'1px solid var(--border)', marginTop: 8 }}>
              <SourcePill source="obsidian"/>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>个人知识库</span>
              <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>14 matches</span>
            </div>
            {[
              { folder:'30-Resources/', f:'RAG 综述.md', loc:'§3.2', q:'检索后通过 <mark>JSON schema</mark> 约束 LLM 输出的结构化摘要…', t:'1 周前', bl: 7 },
              { folder:'10-Projects/', f:'知识库看板.md', loc:'架构草图', q:'后端用 <mark>JSON schema</mark> 校验前端传来的搜索过滤器…', t:'昨天', bl: 5 },
              { folder:'80-方法论/', f:'AI 工作流.md', loc:'line 34', q:'总结：结构化输出的根基是 <mark>JSON Schema</mark> + strict mode…', t:'2 周前', bl: 2 },
            ].map((r, i) => (
              <div key={i} className="kb-card" style={{ padding:'10px 14px', marginBottom: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Icon name="file" size={12} color="var(--src-obsidian)"/>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>{r.folder}</span>
                  <span className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink)', fontWeight: 600 }}>{r.f}</span>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>· {r.loc}</span>
                  <span style={{ marginLeft:'auto', fontSize: 10.5, color:'var(--ink-muted)' }}><Icon name="link" size={10}/> {r.bl} · {r.t}</span>
                </div>
                <div style={{ fontSize: 12.5, color:'var(--ink-sub)', marginTop: 4, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: r.q.replace(/<mark>/g,'<span style="background:#F6E6A8;color:#5a4a2a;padding:0 3px;border-radius:2px;">').replace(/<\/mark>/g,'</span>') }}/>
              </div>
            ))}

            {/* Group: 公司 */}
            <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'18px 0 8px', borderTop:'1px solid var(--border)', marginTop: 8 }}>
              <SourcePill source="work"/>
              <span className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>公司项目</span>
              <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>3 matches</span>
            </div>
            {[
              { proj:'iam', f:'md/memory/architecture.md', loc:'§授权契约', q:'接口契约用 <mark>JSON Schema</mark> 描述，CI 里自动生成 TS 类型…', t:'3 天前' },
              { proj:'message-center-all', f:'md/codex/current/push-rewrite.md', loc:'子任务 2', q:'每种推送 payload 要写 <mark>JSON schema</mark>，扫描器会校验…', t:'5 天前' },
            ].map((r, i) => (
              <div key={i} className="kb-card" style={{ padding:'10px 14px', marginBottom: 6 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                  <Icon name="git" size={12} color="var(--src-work)"/>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--src-work)', fontWeight: 600 }}>{r.proj}</span>
                  <Icon name="chev-r" size={9} color="var(--ink-muted)"/>
                  <span className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink)' }}>{r.f}</span>
                  <span className="kb-mono" style={{ fontSize: 10.5, color:'var(--ink-muted)' }}>· {r.loc}</span>
                  <span style={{ marginLeft:'auto', fontSize: 10.5, color:'var(--ink-muted)' }}>{r.t}</span>
                </div>
                <div style={{ fontSize: 12.5, color:'var(--ink-sub)', marginTop: 4, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: r.q.replace(/<mark>/g,'<span style="background:#F6E6A8;color:#5a4a2a;padding:0 3px;border-radius:2px;">').replace(/<\/mark>/g,'</span>') }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
};

window.SearchPage = SearchPage;
