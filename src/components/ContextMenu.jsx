import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './primitives.jsx';

// 通用右键菜单。createPortal 到 document.body，position:fixed。
// items: [{ label, icon?, onClick, disabled?, danger?, divider?, shortcut? }]
export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // 渲染后用真实尺寸把菜单框 clamp 进视口
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + r.width + 8 > window.innerWidth) {
      left = Math.max(8, window.innerWidth - r.width - 8);
    }
    if (top + r.height + 8 > window.innerHeight) {
      top = Math.max(8, window.innerHeight - r.height - 8);
    }
    setPos({ left, top });
  }, [x, y]);

  // 关闭事件：点击外部 / Escape / 滚动 / 失去焦点
  useEffect(() => {
    const onDown = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const onWheel = () => onClose?.();
    const onBlur = () => onClose?.();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onBlur);
    };
  }, [onClose]);

  const handleClick = (it) => {
    if (it.disabled) return;
    onClose?.();
    // 异步执行避免菜单消失之前还在 React commit 阶段
    Promise.resolve().then(() => it.onClick?.());
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={ref}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        minWidth: 200,
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 4,
        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        zIndex: 200,
        fontFamily: 'var(--font-sans)',
      }}
    >
      {items.map((it, i) => (
        it.divider ? (
          <div key={`d-${i}`} style={{ height: 1, background: 'var(--border)', margin: '4px 4px' }} />
        ) : (
          <button
            key={i}
            type="button"
            disabled={!!it.disabled}
            className="kb-ctx-item"
            onClick={() => handleClick(it)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              border: 0,
              background: 'transparent',
              padding: '6px 10px',
              borderRadius: 4,
              fontSize: 12.5,
              color: it.disabled
                ? 'var(--ink-muted)'
                : (it.danger ? 'var(--danger)' : 'var(--ink)'),
              cursor: it.disabled ? 'not-allowed' : 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {it.icon && (
              <Icon
                name={it.icon}
                size={12}
                color={it.disabled ? 'var(--ink-muted)' : 'var(--ink-sub)'}
              />
            )}
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{it.label}</span>
            {it.shortcut && (
              <span className="kb-mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginLeft: 12 }}>
                {it.shortcut}
              </span>
            )}
          </button>
        )
      ))}
    </div>,
    document.body
  );
}
