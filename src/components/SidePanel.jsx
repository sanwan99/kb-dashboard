import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from './primitives.jsx';

// 右侧辅助栏：支持鼠标拖拽调整宽度 + 折叠成窄条 + localStorage 持久化
// props:
//   storageKey   — 必填，用作 localStorage 的前缀
//   defaultWidth — 初始宽度，默认 280
//   minWidth     — 最小展开宽度，默认 220
//   maxWidth     — 最大展开宽度，默认 520
//   children     — 面板内容（通常由调用方堆叠多个区块，比如 TocSection + BacklinksBody）
export default function SidePanel({
  storageKey,
  defaultWidth = 280,
  minWidth = 220,
  maxWidth = 520,
  children,
}) {
  const widthKey = `kb-side-${storageKey}-width`;
  const collapsedKey = `kb-side-${storageKey}-collapsed`;

  const read = () => {
    if (typeof localStorage === 'undefined') {
      return { width: defaultWidth, collapsed: false };
    }
    const w = Number(localStorage.getItem(widthKey));
    const width = Number.isFinite(w) && w > 0 ? Math.min(maxWidth, Math.max(minWidth, w)) : defaultWidth;
    const collapsed = localStorage.getItem(collapsedKey) === '1';
    return { width, collapsed };
  };
  const [{ width, collapsed }, setState] = useState(read);

  useEffect(() => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(widthKey, String(Math.round(width)));
    localStorage.setItem(collapsedKey, collapsed ? '1' : '0');
  }, [width, collapsed, widthKey, collapsedKey]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    const onMove = (ev) => {
      const next = Math.min(maxWidth, Math.max(minWidth, window.innerWidth - ev.clientX));
      setState((s) => ({ ...s, width: next }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [minWidth, maxWidth]);

  const toggle = () => setState((s) => ({ ...s, collapsed: !s.collapsed }));

  return (
    <>
      {!collapsed && (
        <div
          onMouseDown={startResize}
          title="拖动调整宽度"
          style={{
            width: 4,
            cursor: 'col-resize',
            flexShrink: 0,
            background: 'var(--border)',
            opacity: 0.55,
          }}
        />
      )}
      <aside
        style={{
          width: collapsed ? 28 : width,
          flexShrink: 0,
          background: 'var(--bg-tint)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggle}
            title="展开"
            style={{
              width: '100%',
              height: '100%',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ink-sub)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '10px 0',
            }}
          >
            <Icon name="arrow-l" size={14} />
          </button>
        ) : (
          <>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {children}
            </div>
            <button
              type="button"
              onClick={toggle}
              title="收起"
              style={{
                position: 'absolute',
                top: 8,
                right: 6,
                width: 22,
                height: 22,
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 4,
                zIndex: 2,
              }}
            >
              <Icon name="arrow-r" size={13} />
            </button>
          </>
        )}
      </aside>
    </>
  );
}
