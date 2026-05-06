import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Frame, Icon, SourcePill, SectionHeader } from '../components/primitives.jsx';
import { getHomeOverview, subscribeFileEvents } from '../lib/api.js';

// 5 个 PARA 重点文件夹（与设计稿保持一致）
const PARA_FEATURE = [
  { name: '00-收件箱', icon: 'inbox', summary: '临时入口 · 待归档' },
  { name: '10-Projects', icon: 'folder-open', summary: '进行中的项目' },
  { name: '20-Areas', icon: 'folder', summary: '长期关注领域' },
  { name: '30-Resources', icon: 'folder', summary: '参考资料' },
  { name: '90-MOC', icon: 'graph', summary: 'Maps of Content 导航页' },
];

function relTime(iso) {
  if (!iso) return '—';
  const delta = Date.now() - new Date(iso).getTime();
  const m = Math.floor(delta / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d === 1) return '昨天';
  if (d < 7) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function firstParagraphText(html, limit = 140) {
  if (!html) return '';
  const m = html.match(/<p>([\s\S]+?)<\/p>/);
  if (!m) return '';
  const text = m[1].replace(/<[^>]+>/g, '').trim();
  return text.length > limit ? text.slice(0, limit) + '…' : text;
}

export default function Home() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      getHomeOverview()
        .then((d) => { if (!cancelled) { setOverview(d); setError(null); } })
        .catch((err) => { if (!cancelled) setError(err.message); });
    };
    load();
    // 文件变更 → 5s 防抖重拉概览（avoid 同一批改动多次拉聚合接口）
    let t = null;
    const unsub = subscribeFileEvents(() => {
      clearTimeout(t);
      t = setTimeout(load, 5000);
    });
    return () => { cancelled = true; unsub(); clearTimeout(t); };
  }, []);

  const g = overview?.global;
  const learn = overview?.learn;
  const progress = learn?.progress;
  const obsidianFolderMap = Object.fromEntries((overview?.obsidian?.folders || []).map((f) => [f.name, f]));
  const workProjects = overview?.work?.projects || [];
  const customMounts = overview?.custom?.mounts || [];

  const currentStageName =
    progress && progress.currentIndex != null
      ? progress.stages.find((s) => s.index === progress.currentIndex)?.name || ''
      : '';

  return (
    <Frame>
      <div className="kb-scroll" style={{ flex: 1, padding: '20px 28px 28px' }}>
        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="kb-serif" style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
              晚上好，<span style={{ color: 'var(--accent)' }}>Haolin</span>
            </h1>
            <div style={{ color: 'var(--ink-sub)', fontSize: 13.5, marginTop: 4 }}>
              {g ? (
                <>
                  全部来源共 <b>{g.totalFiles}</b> 个 md 文件 · 最近 7 天编辑 <b>{g.editedRecent}</b> 篇
                  {progress?.streak != null && (
                    <span> · 学习连续 <b style={{ color: 'var(--src-learn)' }}>{progress.streak}</b> 天</span>
                  )}
                </>
              ) : error ? (
                <span style={{ color: 'var(--danger)' }}>概览加载失败：{error}</span>
              ) : (
                '加载中…'
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/obsidian" className="kb-btn" style={{ textDecoration: 'none' }}>
              <Icon name="inbox" size={14} /> 收件箱
              {obsidianFolderMap['00-收件箱'] && (
                <span className="badge" style={{ marginLeft: 2 }}>{obsidianFolderMap['00-收件箱'].fileCount}</span>
              )}
            </Link>
            <Link to="/learn" className="kb-btn primary" style={{ textDecoration: 'none' }}>
              <Icon name="play" size={13} /> 继续上次学习
            </Link>
          </div>
        </div>

        {/* ── Band 1: 学习项目 ──────────────────── */}
        <SectionHeader
          source="learn"
          title="学习项目"
          subtitle={learn ? `${learn.fileCount} 个 md · 最近 ${relTime(learn.latestMtime)}` : '加载中…'}
          right={
            <Link to="/learn" className="kb-btn ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
              查看全部 <Icon name="arrow-r" size={12} />
            </Link>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 28 }}>
          {/* Hero card: breakpoint */}
          <div className="kb-card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 140, height: 140, background: 'radial-gradient(circle at top right, var(--src-learn-bg), transparent 70%)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <SourcePill source="learn" />
                <span className="badge live"><span className="src-dot" style={{ background: 'var(--src-learn)' }} /> 当前断点</span>
              </div>
              <h3 className="kb-serif" style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600 }}>AI Agent 学习项目</h3>
              <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 14 }}>
                progress.md
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-sub)', lineHeight: 1.6, marginBottom: 14, minHeight: 40 }}>
                {progress ? (
                  <>
                    <b style={{ color: 'var(--ink)' }}>{progress.currentStageText || '未识别当前阶段'}</b>
                    <br />
                    <span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>
                      {firstParagraphText(progress.breakpointHtml, 100)}
                    </span>
                  </>
                ) : (
                  '加载中…'
                )}
              </div>

              {progress && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6 }}>
                    <span>
                      阶段 {progress.currentIndex ?? '?'} / {progress.totalStages}
                      {currentStageName && ` · ${currentStageName}`}
                    </span>
                    <span className="kb-mono">{progress.progressPct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-sunk)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                    {progress.stages.map((s, i) => {
                      const fill = s.status === 'done' ? 1 : s.status === 'in-progress' ? 0.55 : 0;
                      return (
                        <div
                          key={s.index}
                          style={{
                            flex: 1,
                            marginRight: i < progress.stages.length - 1 ? 2 : 0,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${fill * 100}%`,
                              background: 'var(--src-learn)',
                              opacity: s.status === 'in-progress' ? 0.65 : 1,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Link to="/learn" className="kb-btn primary" style={{ height: 32, textDecoration: 'none' }}>
                  <Icon name="play" size={13} /> 从断点继续
                </Link>
                <Link to="/learn" className="kb-btn" style={{ height: 32, textDecoration: 'none' }}>
                  进度表
                </Link>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
                  <Icon name="clock" size={12} />
                  {progress ? relTime(progress.mtime) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Review queue — 真实 review 专题 */}
          <div className="kb-card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="clock" size={14} color="var(--src-learn)" />
                <b style={{ fontSize: 13 }}>复习专题</b>
              </div>
              <span className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                {learn?.reviewTopics?.length ?? 0} 个
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {(learn?.reviewTopics || []).slice(0, 5).map((t) => (
                <div
                  key={t.name}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--bg-sunk)' }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--src-learn)' }} />
                  <span className="kb-mono" style={{ fontSize: 12.5, color: 'var(--ink)', flex: 1 }}>{t.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                    {t.fileCount} md · {relTime(t.latestMtime)}
                  </span>
                </div>
              ))}
              {learn?.reviewTopics?.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '8px 2px' }}>暂无复习专题</div>
              )}
            </div>
          </div>

          {/* Streak + today — mock 占位 */}
          <div className="kb-card" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Icon name="flag" size={14} color="var(--src-learn)" />
              <b style={{ fontSize: 13 }}>近 7 天编辑</b>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span className="kb-serif" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1, color: 'var(--ink)' }}>
                {g ? g.editedRecent : '—'}
              </span>
              <span style={{ fontSize: 13, color: 'var(--ink-sub)' }}>篇</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>三源合并统计 · mtime &lt; 7d</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
              {[1, 1, 1, 0, 1, 1, 0.3].map((v, i) => (
                <div key={i} style={{ height: 24, borderRadius: 3, background: v >= 1 ? 'var(--src-learn)' : v > 0 ? 'var(--src-learn-bg)' : 'var(--bg-sunk)' }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-faint)', marginTop: 4 }}>
              <span>占位</span>
              <span>打卡串联待 C4 接入</span>
            </div>
          </div>
        </div>

        {/* ── Band 2: Obsidian ──────────────────── */}
        <SectionHeader
          source="obsidian"
          title="Obsidian 知识库"
          subtitle={overview?.obsidian ? `PARA · ${overview.obsidian.fileCount} 个 md · 最近 ${relTime(overview.obsidian.latestMtime)}` : 'PARA · 加载中…'}
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              <Link to="/obsidian" className="kb-btn ghost" style={{ fontSize: 12, color: 'var(--src-obsidian)', textDecoration: 'none' }}>
                <Icon name="inbox" size={12} />
                收件箱·{obsidianFolderMap['00-收件箱']?.fileCount ?? 0}
              </Link>
              <Link to="/obsidian" className="kb-btn ghost" style={{ fontSize: 12, color: 'var(--src-obsidian)', textDecoration: 'none' }}>
                <Icon name="graph" size={12} />
                MOC·{obsidianFolderMap['90-MOC']?.fileCount ?? 0}
              </Link>
            </div>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
          {PARA_FEATURE.map((c) => {
            const folder = obsidianFolderMap[c.name];
            return (
              <Link
                key={c.name}
                to="/obsidian"
                className="kb-card"
                style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--src-obsidian-bg)', color: 'var(--src-obsidian)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={c.icon} size={13} />
                  </div>
                  <span className="kb-mono" style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>{c.name}</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-sub)', lineHeight: 1.5, flex: 1, minHeight: 36 }}>{c.summary}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                  <span>{folder ? `${folder.fileCount} 文件` : '—'}</span>
                  <span>{folder ? relTime(folder.latestMtime) : '—'}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── Band 3: 公司笔记 ──────────────────── */}
        <SectionHeader
          source="work"
          title="公司项目笔记"
          subtitle={overview?.work ? `${overview.work.fileCount} 个 md · 最近 ${relTime(overview.work.latestMtime)}` : '加载中…'}
          right={
            <Link to="/work" className="kb-btn ghost" style={{ fontSize: 12, textDecoration: 'none' }}>
              <Icon name="terminal" size={12} />
              {workProjects.reduce((s, p) => s + p.activeTaskCount, 0)} 个活跃任务
            </Link>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {workProjects.map((p) => (
            <Link
              key={p.name}
              to="/work"
              className="kb-card"
              style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--src-work-bg)', color: 'var(--src-work)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="git" size={13} />
                </div>
                <span className="kb-mono" style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                {p.activeTaskCount > 0 && (
                  <span className="badge live" style={{ fontSize: 10 }}>
                    <span className="src-dot work" /> {p.activeTaskCount}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', lineHeight: 1.55, flex: 1 }}>
                {p.activeTaskCount > 0
                  ? `${p.activeTaskCount} 个活跃任务 · 最近 ${relTime(p.latestActive)}`
                  : '无活跃任务 · 归档中'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                <span>{p.fileCount} md 总量</span>
                <span>{relTime(p.latestMtime)}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Band 4: 自定义来源 ──────────────────── */}
        <SectionHeader
          source="custom"
          title="自定义来源"
          subtitle={
            overview?.custom
              ? `${overview.custom.mountCount} 个目录 · ${overview.custom.fileCount} 个 md${overview.custom.latestMtime ? ` · 最近 ${relTime(overview.custom.latestMtime)}` : ''}`
              : '加载中…'
          }
          right={
            <Link to="/custom" className="kb-btn ghost" style={{ fontSize: 12, textDecoration: 'none', color: 'var(--src-custom)' }}>
              <Icon name="folder-open" size={12} /> 管理
            </Link>
          }
        />
        {customMounts.length === 0 ? (
          <Link
            to="/custom"
            className="kb-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 18,
              marginTop: 4,
              textDecoration: 'none',
              color: 'inherit',
              borderStyle: 'dashed',
            }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--src-custom-bg)', color: 'var(--src-custom)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="folder-open" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 600 }}>还没有引入任何目录</div>
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', marginTop: 2 }}>
                点这里去自定义来源页面，添加一个本地目录就能在看板里浏览/搜索它的 md 了。
              </div>
            </div>
            <Icon name="arrow-r" size={14} color="var(--ink-muted)" />
          </Link>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {customMounts.map((m) => (
              <Link
                key={m.id}
                to="/custom"
                className="kb-card"
                style={{
                  padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
                  textDecoration: 'none', color: 'inherit',
                  opacity: m.available ? 1 : 0.55,
                }}
                title={m.realRoot}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--src-custom-bg)', color: 'var(--src-custom)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="folder-open" size={13} />
                  </div>
                  <span
                    className="kb-mono"
                    style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {m.name}
                  </span>
                  {!m.available && (
                    <span style={{ fontSize: 10, color: 'var(--danger)' }}>不可用</span>
                  )}
                </div>
                <div
                  className="kb-mono"
                  style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {m.realRoot}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-muted)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span>{m.fileCount} md</span>
                  <span>{m.latestMtime ? relTime(m.latestMtime) : '—'}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}
