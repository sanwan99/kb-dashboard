import React, { useEffect, useState } from 'react';
import { Icon } from './primitives.jsx';

// 右栏通用可折叠分区
// props:
//   storageKey   — 必填，持久化展开/收起状态到 localStorage
//   title        — 标题
//   icon         — 可选图标名（primitives.jsx 的 Icon 集合）
//   accent       — 图标与 badge 强调色，默认 var(--ink-sub)
//   badge        — 可选右侧计数（数字/字符串），为 null/undefined 时不渲染
//   defaultOpen  — 初始展开状态，默认 true
//   children     — 展开时渲染的内容
export default function CollapsibleSection({
  storageKey,
  title,
  icon,
  accent = 'var(--ink-sub)',
  badge,
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === 'undefined') return defaultOpen;
    const v = localStorage.getItem(storageKey);
    if (v === '0') return false;
    if (v === '1') return true;
    return defaultOpen;
  });
  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(storageKey, open ? '1' : '0'); } catch { /* ignore */ }
  }, [open, storageKey]);

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          color: 'var(--ink)',
          textAlign: 'left',
        }}
      >
        <Icon name={open ? 'chev-d' : 'chev-r'} size={12} color="var(--ink-muted)" />
        {icon && <Icon name={icon} size={13} color={accent} />}
        <b style={{ fontSize: 12.5 }}>{title}</b>
        {badge !== null && badge !== undefined && (
          <span
            className="badge"
            style={{
              marginLeft: 'auto',
              fontSize: 10,
              color: accent,
              background: 'var(--bg-sunk)',
              borderColor: 'var(--border)',
            }}
          >
            {badge}
          </span>
        )}
      </button>
      {open && <div style={{ padding: '0 0 8px' }}>{children}</div>}
    </div>
  );
}
