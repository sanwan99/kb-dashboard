import { Frame, Icon } from '../components/primitives.jsx';
import { useTheme } from '../lib/useTheme.js';
import {
  usePrefs,
  setDensity,
  setFontSize,
  toggleSource,
  setBehavior,
} from '../lib/usePrefs.js';

const SOURCE_META = [
  { id: 'learn', label: '学习项目', path: '~/Desktop/文档/个人学习项目/' },
  { id: 'obsidian', label: 'Obsidian 知识库', path: '~/Desktop/文档/个人知识库/' },
  { id: 'work', label: '公司项目笔记', path: '~/work/code/sanwan/notes/' },
  { id: 'custom', label: '自定义来源', path: '~/.kb-dashboard/custom-sources.json' },
];

const BEHAVIOR_OPTIONS = [
  { key: 'restoreLastFile', label: '启动时恢复上次打开的文件' },
  { key: 'openBreakpointOnLearn', label: '学习项目页默认展开断点卡' },
  { key: 'wikilinkSameWindow', label: '[[wikilink]] 点击行为：同窗打开' },
  { key: 'renderMermaid', label: '启用 Mermaid 流程图渲染（~600KB 按需加载）' },
];

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: on ? 'var(--accent)' : 'var(--bg-sunk)',
        border: '1px solid var(--border)',
        position: 'relative',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 1,
          left: on ? 17 : 1,
          width: 16,
          height: 16,
          borderRadius: 8,
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          transition: 'left 0.15s',
          display: 'block',
        }}
      />
    </button>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className="kb-btn"
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              fontSize: 12,
              background: on ? 'var(--ink)' : 'var(--bg-raised)',
              color: on ? 'var(--bg)' : 'var(--ink)',
              borderColor: on ? 'var(--ink)' : 'var(--border)',
              fontWeight: on ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function Prefs() {
  const prefs = usePrefs();
  const { theme, setTheme } = useTheme();

  return (
    <Frame>
      <div className="kb-scroll" style={{ flex: 1, padding: '24px 32px 32px' }}>
        <h1 className="kb-serif" style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
          首选项
        </h1>
        <div style={{ color: 'var(--ink-sub)', fontSize: 13.5, marginTop: 4, marginBottom: 24 }}>
          本地存于 <code className="kb-mono" style={{ fontSize: 12 }}>localStorage · kb-theme / kb-prefs</code>
          {' '}· 所有更改即时生效
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 1100 }}>
          {/* 笔记源 */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              笔记源
            </div>
            {SOURCE_META.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <span className={`src-dot ${s.id}`} style={{ width: 10, height: 10 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                  <div className="kb-mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{s.path}</div>
                </div>
                <Toggle on={prefs.sources[s.id]} onChange={(v) => toggleSource(s.id, v)} />
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 10, lineHeight: 1.5 }}>
              关闭后本地 UI 在显示层过滤；软链依然保留（路径变更需要重建 <code className="kb-mono">data/*</code> 软链）
            </div>
          </div>

          {/* 外观 */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              外观
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', marginBottom: 6 }}>主题</div>
              <Segmented
                options={[
                  { value: 'light', label: '浅色' },
                  { value: 'dark', label: '深色' },
                  { value: 'system', label: '跟随系统' },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-sub)', marginBottom: 6 }}>信息密度（预留，CSS 主题变量后续完善）</div>
              <Segmented
                options={[
                  { value: 'breathe', label: '呼吸感' },
                  { value: 'standard', label: '标准' },
                  { value: 'compact', label: '紧凑' },
                ]}
                value={prefs.density}
                onChange={setDensity}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-sub)', marginBottom: 6 }}>
                <span>正文字号</span>
                <span className="kb-mono" style={{ color: 'var(--ink)' }}>{prefs.fontSize}px</span>
              </div>
              <input
                type="range"
                min={12}
                max={20}
                step={1}
                value={prefs.fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink-muted)', marginTop: 2 }}>
                <span>12</span>
                <span>16</span>
                <span>20</span>
              </div>
            </div>
          </div>

          {/* 行为 */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              行为
            </div>
            {BEHAVIOR_OPTIONS.map((r) => (
              <div
                key={r.key}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--border)' }}
              >
                <div style={{ flex: 1, fontSize: 13 }}>{r.label}</div>
                <Toggle
                  on={prefs.behavior[r.key]}
                  onChange={(v) => setBehavior(r.key, v)}
                />
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginTop: 10, lineHeight: 1.5 }}>
              "启动时恢复" / "wikilink 同窗" 目前保存状态但未接显示层；Mermaid 开关与学习页默认断点已生效。
            </div>
          </div>

          {/* 键盘快捷键 */}
          <div className="kb-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              键盘快捷键
            </div>
            {[
              { n: '全局搜索（焦点搜索框）', k: ['⌘', 'K'] },
              { n: '搜索下拉：上下导航', k: ['↑', '↓'] },
              { n: '搜索下拉：打开当前项', k: ['↵'] },
              { n: '关闭搜索下拉', k: ['Esc'] },
            ].map((r) => (
              <div
                key={r.n}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: '1px solid var(--border)' }}
              >
                <div style={{ flex: 1, fontSize: 13 }}>{r.n}</div>
                <div style={{ display: 'flex', gap: 3 }}>
                  {r.k.map((k, i) => (
                    <span key={i} className="kc">{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 诊断 */}
        <div className="kb-card" style={{ padding: 18, marginTop: 18, background: 'var(--bg-tint)', maxWidth: 1100 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            诊断
          </div>
          <pre style={{ margin: 0, fontSize: 12, padding: '10px 14px', background: 'var(--bg-raised)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <code>
{`theme=${theme} (resolved=${document.documentElement.dataset.theme})
density=${prefs.density}  fontSize=${prefs.fontSize}px
sources=${JSON.stringify(prefs.sources)}
behavior=${JSON.stringify(prefs.behavior)}`}
            </code>
          </pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              className="kb-btn"
              onClick={() => {
                if (confirm('确定重置所有首选项为默认值？')) {
                  localStorage.removeItem('kb-prefs');
                  localStorage.removeItem('kb-theme');
                  localStorage.removeItem('learn-progress-open');
                  location.reload();
                }
              }}
            >
              <Icon name="x" size={13} /> 重置首选项
            </button>
          </div>
        </div>
      </div>
    </Frame>
  );
}
