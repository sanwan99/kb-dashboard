import { useTheme } from '../lib/useTheme.js';
import { usePrefs, setDensity, setFontSize, setBehavior } from '../lib/usePrefs.js';

export default function LibrarySettings() {
  const prefs = usePrefs();
  const { theme, setTheme } = useTheme();
  return <div>
    <div className="library-setting-row"><div><strong>外观</strong><p>选择舒适的阅读背景。</p></div><div className="library-segmented">{[['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].map(([key, label]) => <button type="button" key={key} className={theme === key ? 'active' : ''} aria-pressed={theme === key} onClick={() => setTheme(key)}>{label}</button>)}</div></div>
    <div className="library-setting-row"><div><strong>结果列表密度</strong><p>调整列表间距，不影响正文字号。</p></div><div className="library-segmented">{[['compact', '紧凑'], ['standard', '标准'], ['breathe', '宽松']].map(([key, label]) => <button type="button" key={key} className={prefs.density === key ? 'active' : ''} aria-pressed={prefs.density === key} onClick={() => setDensity(key)}>{label}</button>)}</div></div>
    <div className="library-setting-row vertical"><label htmlFor="library-font-size">正文字号<span>{prefs.fontSize}px</span></label><input id="library-font-size" type="range" min="12" max="20" value={prefs.fontSize} onChange={(event) => setFontSize(event.target.value)} /><p className="library-font-preview" style={{ fontSize: prefs.fontSize }}>让资料读起来更轻松。</p></div>
    {[['restoreLastFile', '启动时恢复上次阅读', '打开检索台时继续上次的文档。'], ['renderMermaid', '显示 Mermaid 流程图', '将文档中的流程图代码渲染成图形。']].map(([key, label, description]) => <div className="library-setting-row" key={key}><div><strong>{label}</strong><p>{description}</p></div><button type="button" role="switch" aria-label={label} aria-checked={Boolean(prefs.behavior[key])} className={`library-switch ${prefs.behavior[key] ? 'on' : ''}`} onClick={() => setBehavior(key, !prefs.behavior[key])}><span /></button></div>)}
    <p className="library-dialog-description">设置保存在本机，立即生效。拖动两栏分隔线调整比例，双击可恢复默认。</p>
  </div>;
}
