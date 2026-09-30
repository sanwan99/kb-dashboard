import { useState } from 'react';
import { Icon } from './primitives.jsx';
import { addCustomSource, renameCustomSource, removeCustomSource, pickDirectory } from '../lib/api.js';
import { usePrefs, toggleSource } from '../lib/usePrefs.js';

export default function LibrarySources({ sources, mounts, onRefresh, onRemoved, notify }) {
  const prefs = usePrefs();
  const [adding, setAdding] = useState(false);
  const [path, setPath] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [renamed, setRenamed] = useState('');
  const [removing, setRemoving] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const execute = async (action, message) => {
    if (pending) return;
    setPending(true); setError('');
    try {
      await action();
      try { await onRefresh(); }
      catch { notify(`${message}，列表暂时未刷新，请重新连接服务。`); return true; }
      notify(message);
      return true;
    }
    catch (cause) { setError(cause.message); return false; }
    finally { setPending(false); }
  };

  const add = async (event) => {
    event.preventDefault();
    const value = path.trim();
    if (!value) { setError('请选择或填写一个本地目录。'); return; }
    if (!value.startsWith('/') && !value.startsWith('~/')) { setError('请填写绝对路径，或以 ~/ 开头的目录。'); return; }
    const done = await execute(() => addCustomSource({ path: value, name: name.trim() || undefined }), '目录已接入');
    if (done) { setAdding(false); setPath(''); setName(''); }
  };

  const choose = async () => {
    const result = await pickDirectory({ title: '选择资料目录', defaultPath: path || undefined });
    if (result.error) setError(result.error);
    if (!result.canceled && result.path) { setPath(result.path); setError(''); }
  };

  if (removing) return <div className="library-source-confirm">
    <h3>移除“{removing.name}”？</h3>
    <p>此目录将不再参与浏览和检索，磁盘上的文件会保留。</p>
    <code>{removing.realRoot}</code>
    {error && <p className="library-form-error" role="alert">{error}</p>}
    <div className="library-dialog-actions"><button className="library-button" type="button" disabled={pending} onClick={() => { setRemoving(null); setError(''); }}>取消</button><button className="library-button danger" type="button" disabled={pending} onClick={async () => {
      const done = await execute(() => removeCustomSource(removing.id), '已移除资料来源，原文件保留');
      if (done) { onRemoved(removing.id); setRemoving(null); }
    }}>{pending ? '正在移除…' : '移除来源'}</button></div>
  </div>;

  return <div>
    <p className="library-dialog-description">连接本地目录，集中浏览和检索。原文件保留在各自的位置。</p>
    {sources.filter((source) => !source.multi).map((source) => <div className="library-source-row" key={source.id}>
      <Icon name="folder" size={25} /><div><strong>{source.label}</strong><span>{source.realRoot}</span><small className={!source.exists ? 'unavailable' : ''}>{source.exists ? '项目目录' : '目录不可用，请检查软链或访问权限'}</small></div>
      <button type="button" className={`library-switch ${prefs.sources[source.id] !== false ? 'on' : ''}`} role="switch" aria-label={`显示${source.label}`} aria-checked={prefs.sources[source.id] !== false} onClick={() => toggleSource(source.id, prefs.sources[source.id] === false)}><span /></button>
    </div>)}
    <div className="library-source-group"><div><h3>本地目录</h3><span>在检索台中显示</span></div><button type="button" className={`library-switch ${prefs.sources.custom !== false ? 'on' : ''}`} role="switch" aria-label="显示本地目录" aria-checked={prefs.sources.custom !== false} onClick={() => toggleSource('custom', prefs.sources.custom === false)}><span /></button></div>
    {mounts.map((mount) => <div className="library-source-row" key={mount.id}>
      <Icon name="folder-open" size={24} /><div>
        {editing === mount.id ? <form className="library-rename" onSubmit={async (event) => {
          event.preventDefault(); if (!renamed.trim()) { setError('名称不能为空。'); return; }
          if (renamed.trim() === mount.name) { setEditing(null); return; }
          if (await execute(() => renameCustomSource(mount.id, renamed.trim()), '名称已更新')) setEditing(null);
        }}><input autoFocus aria-label="目录新名称" value={renamed} onChange={(event) => setRenamed(event.target.value)} /><button type="submit" className="library-icon-button" aria-label="保存目录名称" disabled={pending}><Icon name="check" size={17} /></button><button type="button" className="library-icon-button" aria-label="取消重命名" onClick={() => setEditing(null)}><Icon name="x" size={17} /></button></form> : <strong>{mount.name}</strong>}
        <span>{mount.realRoot}</span><small className={!mount.available ? 'unavailable' : ''}>{mount.available ? '已连接' : '目录不可用，原路径可能已移动'}</small>
      </div><div className="library-source-actions"><button type="button" className="library-text-button" disabled={pending} aria-label={`重命名 ${mount.name}`} onClick={() => { setEditing(mount.id); setRenamed(mount.name); setError(''); }}>改名</button><button type="button" className="library-text-button danger" disabled={pending} aria-label={`移除 ${mount.name}`} onClick={() => { setRemoving(mount); setError(''); }}>移除</button></div>
    </div>)}
    {!mounts.length && <p className="library-muted">还没有连接本地目录。</p>}
    {error && <p className="library-form-error" role="alert">{error}</p>}
    {adding ? <form className="library-source-form" onSubmit={add}>
      <label>目录路径<div className="library-path-input"><input autoFocus value={path} placeholder="例如：~/Documents/项目资料" onChange={(event) => { setPath(event.target.value); setError(''); }} />{typeof window.__KB_PICK_DIR__ === 'function' && <button type="button" className="library-button" onClick={choose}>选择目录</button>}</div></label>
      <label>显示名称（可选）<input value={name} placeholder="留空时使用目录名称" onChange={(event) => setName(event.target.value)} maxLength={100} /></label>
      <div className="library-dialog-actions"><button type="button" className="library-button" disabled={pending} onClick={() => { setAdding(false); setError(''); }}>取消</button><button type="submit" className="library-button primary" disabled={pending}>{pending ? '正在连接…' : '连接目录'}</button></div>
    </form> : <button type="button" className="library-button library-add-source" onClick={() => { setAdding(true); setError(''); }}><Icon name="folder-open" size={18} />添加本地目录</button>}
  </div>;
}
