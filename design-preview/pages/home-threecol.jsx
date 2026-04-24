// Home alt A — 三列并排 (each source = its own column, scrollable)

const HomeThreeCol = () => {
  const Col = ({ source, title, path, children, headerRight }) => {
    const srcCls = source === 'learn' ? 'learn' : source === 'obsidian' ? 'obsidian' : 'work';
    const accent = `var(--src-${source})`;
    return (
      <div style={{ flex: 1, display:'flex', flexDirection:'column', minWidth: 0, borderRight:'1px solid var(--border)' }}>
        <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--border)', background:'var(--bg-tint)' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 4 }}>
            <span className="src-dot" style={{ background: accent, width: 10, height: 10 }}/>
            <b className="kb-serif" style={{ fontSize: 16, letterSpacing:'-0.01em' }}>{title}</b>
            {headerRight}
          </div>
          <div className="kb-mono" style={{ fontSize: 11, color:'var(--ink-muted)' }}>{path}</div>
        </div>
        <div className="kb-scroll" style={{ flex: 1, padding: 14, display:'flex', flexDirection:'column', gap: 10 }}>
          {children}
        </div>
      </div>
    );
  };

  const Row = ({ icon, name, meta, desc, src }) => (
    <div className="kb-card" style={{ padding: 12, display:'flex', flexDirection:'column', gap: 6 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
        <Icon name={icon} size={13} color={`var(--src-${src})`}/>
        <span className="kb-mono" style={{ fontSize: 12, fontWeight: 600 }}>{name}</span>
        <span style={{ marginLeft:'auto', fontSize: 11, color:'var(--ink-muted)' }}>{meta}</span>
      </div>
      {desc && <div style={{ fontSize: 12.5, color:'var(--ink-sub)', lineHeight: 1.5 }}>{desc}</div>}
    </div>
  );

  return (
    <Frame active="home">
      <div style={{ flex:1, display:'flex', minHeight: 0 }}>
        <Col source="learn" title="学习项目" path="~/个人学习项目/">
          <div className="kb-card" style={{ padding: 12, background:'var(--src-learn-bg)', borderColor:'#D8E3F5' }}>
            <div style={{ fontSize: 11, color:'var(--src-learn)', fontWeight: 600, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom: 6 }}>当前断点</div>
            <div className="kb-mono" style={{ fontSize: 11.5, color:'var(--ink-sub)', marginBottom: 6 }}>18-function-calling-strict-mode.md</div>
            <div style={{ fontSize: 12.5, color:'var(--ink)', lineHeight: 1.5, marginBottom: 10 }}>§4 JSON Schema 严格模式的 edge cases</div>
            <button className="kb-btn primary" style={{ height: 28, width:'100%', justifyContent:'center' }}><Icon name="play" size={12}/> 继续</button>
          </div>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em', paddingTop: 6 }}>复习专题</div>
          <Row icon="clock" name="prompting" meta="今天" desc="5 个文件 · 上次复习 3 天前" src="learn"/>
          <Row icon="clock" name="embeddings" meta="2 天后" desc="5 个文件" src="learn"/>
          <Row icon="clock" name="react-loop" meta="逾期" desc="5 个文件 · 需要补打卡" src="learn"/>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em', paddingTop: 6 }}>最近编辑</div>
          <Row icon="file" name="18-function-calling...md" meta="刚刚" src="learn"/>
          <Row icon="file" name="17-tool-definition.md" meta="昨天" src="learn"/>
          <Row icon="file" name="progress.md" meta="昨天" src="learn"/>
        </Col>

        <Col source="obsidian" title="Obsidian 知识库" path="~/个人知识库/"
          headerRight={<span className="badge" style={{ marginLeft:'auto', background:'var(--src-obsidian-bg)', color:'var(--src-obsidian)', borderColor:'#DFD5F0' }}>482</span>}>
          <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
            <button className="kb-btn ghost" style={{ height: 26, fontSize: 11.5, color:'var(--src-obsidian)', background:'var(--src-obsidian-bg)' }}>收件箱·7</button>
            <button className="kb-btn ghost" style={{ height: 26, fontSize: 11.5 }}>MOC·14</button>
            <button className="kb-btn ghost" style={{ height: 26, fontSize: 11.5 }}>防再犯</button>
          </div>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em' }}>PARA 目录</div>
          <Row icon="inbox" name="00-收件箱" meta="7 · 10 分前" src="obsidian"/>
          <Row icon="folder-open" name="10-Projects" meta="42 · 1h" desc="知识库看板 · RAG Demo · 周会" src="obsidian"/>
          <Row icon="folder" name="20-Areas" meta="96 · 昨天" src="obsidian"/>
          <Row icon="folder" name="30-Resources" meta="218" src="obsidian"/>
          <Row icon="graph" name="90-MOC" meta="14" src="obsidian"/>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em', paddingTop: 6 }}>最近反链活跃</div>
          <Row icon="link" name="学习方法 MOC.md" meta="12 ←" desc="被 8 篇新笔记引用" src="obsidian"/>
          <Row icon="link" name="PARA 方法论.md" meta="7 ←" src="obsidian"/>
        </Col>

        <Col source="work" title="公司项目笔记" path="~/work/code/sanwan/notes/">
          <div style={{ display:'flex', alignItems:'center', gap: 6, padding:'8px 10px', background:'var(--src-work-bg)', borderRadius: 6, border:'1px solid #ECD9BF' }}>
            <Icon name="terminal" size={13} color="var(--src-work)"/>
            <span style={{ fontSize: 12, color:'var(--src-work)', fontWeight: 600 }}>6 个活跃 codex 任务</span>
          </div>
          <div style={{ fontSize: 11, color:'var(--ink-muted)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.05em', paddingTop: 4 }}>项目</div>
          <Row icon="git" name="iam" meta="3 🚧 · 20m" desc="重构 token 刷新策略" src="work"/>
          <Row icon="git" name="gc-base-log" meta="2 🚧 · 1h" desc="OpenTelemetry 接入" src="work"/>
          <Row icon="git" name="message-center-all" meta="1 🚧 · 2d" desc="消息推送重构" src="work"/>
          <Row icon="git" name="gc-cls" meta="空闲" desc="无活跃任务" src="work"/>
        </Col>
      </div>
    </Frame>
  );
};

window.HomeThreeCol = HomeThreeCol;
