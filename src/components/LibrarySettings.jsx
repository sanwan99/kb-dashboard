import { useTheme } from '../lib/useTheme.js';
import { usePrefs, setSurface, setGlassIntensity, setWindowOpacity, setReaderOpacity, setDensity, setFontSize, setBehavior } from '../lib/usePrefs.js';

export default function LibrarySettings() {
  const prefs = usePrefs();
  const { theme, setTheme } = useTheme();
  const nativeBackdrop = Boolean(window.__KB_WINDOW_MATERIAL__?.nativeBackdrop);
  return <div>
    <div className="library-setting-row"><div><strong>外观</strong><p>选择舒适的阅读背景。</p></div><div className="library-segmented">{[['light', '浅色'], ['dark', '深色'], ['system', '跟随系统']].map(([key, label]) => <button type="button" key={key} className={theme === key ? 'active' : ''} aria-pressed={theme === key} onClick={() => setTheme(key)}>{label}</button>)}</div></div>
    <div className="library-setting-row"><div><strong>界面材质</strong><p>{nativeBackdrop ? '玻璃模式透出窗口后面的壁纸或其他窗口。简洁模式使用纯色背景。' : '选择玻璃或纯色界面。macOS 桌面版支持窗口后景透光。'}</p></div><div className="library-segmented">{[['liquid', '液态玻璃'], ['flat', '简洁']].map(([key, label]) => <button type="button" key={key} className={prefs.surface === key ? 'active' : ''} aria-pressed={prefs.surface === key} onClick={() => setSurface(key)}>{label}</button>)}</div></div>
    {prefs.surface === 'liquid' && <div className="library-setting-row vertical"><label htmlFor="library-glass-intensity">玻璃强度<span>{prefs.glassIntensity}%</span></label><input id="library-glass-intensity" type="range" min="0" max="100" value={prefs.glassIntensity} onChange={(event) => setGlassIntensity(event.target.value)} /><p>{nativeBackdrop ? '调整导航和卡片的玻璃效果。正文底色可单独设置。' : '调整玻璃表面的高光与透光程度。70% 以上，阅读面板与结果卡片也使用玻璃材质。'}</p></div>}
    {nativeBackdrop && prefs.surface === 'liquid' && <div className="library-setting-row vertical"><label htmlFor="library-window-opacity">窗口底色<span>{prefs.windowOpacity}%</span></label><input id="library-window-opacity" type="range" min="0" max="100" step="1" value={prefs.windowOpacity} onChange={(event) => setWindowOpacity(event.target.value)} /><p>数值越小，壁纸和后面的窗口越清楚。0% 不叠加窗口底色。</p></div>}
    {nativeBackdrop && prefs.surface === 'liquid' && <div className="library-setting-row vertical"><label htmlFor="library-reader-opacity">正文底色<span>{prefs.readerOpacity}%</span></label><input id="library-reader-opacity" type="range" min="0" max="100" step="1" value={prefs.readerOpacity} onChange={(event) => setReaderOpacity(event.target.value)} /><p>数值越小，正文背景越通透。拖动立即生效，文字保持清晰。</p></div>}
    <div className="library-setting-row"><div><strong>结果列表密度</strong><p>调整列表间距，不影响正文字号。</p></div><div className="library-segmented">{[['compact', '紧凑'], ['standard', '标准'], ['breathe', '宽松']].map(([key, label]) => <button type="button" key={key} className={prefs.density === key ? 'active' : ''} aria-pressed={prefs.density === key} onClick={() => setDensity(key)}>{label}</button>)}</div></div>
    <div className="library-setting-row vertical"><label htmlFor="library-font-size">正文字号<span>{prefs.fontSize}px</span></label><input id="library-font-size" type="range" min="12" max="20" value={prefs.fontSize} onChange={(event) => setFontSize(event.target.value)} /><p className="library-font-preview" style={{ fontSize: prefs.fontSize }}>让资料读起来更轻松。</p></div>
    {[['restoreLastFile', '启动时恢复上次阅读', '打开检索台时继续上次的文档。'], ['renderMermaid', '显示 Mermaid 流程图', '将文档中的流程图代码渲染成图形。']].map(([key, label, description]) => <div className="library-setting-row" key={key}><div><strong>{label}</strong><p>{description}</p></div><button type="button" role="switch" aria-label={label} aria-checked={Boolean(prefs.behavior[key])} className={`library-switch ${prefs.behavior[key] ? 'on' : ''}`} onClick={() => setBehavior(key, !prefs.behavior[key])}><span /></button></div>)}
    <p className="library-dialog-description">设置保存在本机，立即生效。拖动两栏分隔线调整比例，双击可恢复默认。</p>
  </div>;
}
