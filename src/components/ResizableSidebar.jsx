import React, { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
};

export default function ResizableSidebar({
  storageKey,
  defaultWidth,
  minWidth = 220,
  maxWidth = 560,
  label = '调整左侧栏宽度',
  accentColor = 'var(--accent)',
  children,
  style,
}) {
  const sidebarRef = useRef(null);
  const cleanupRef = useRef(null);
  const [width, setWidth] = useState(() => {
    const storage = getStorage();
    if (!storage) return defaultWidth;
    const stored = Number(storage.getItem(storageKey));
    return Number.isFinite(stored) && stored > 0
      ? clamp(stored, minWidth, maxWidth)
      : defaultWidth;
  });

  useEffect(() => {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(storageKey, String(Math.round(width)));
  }, [storageKey, width]);

  useEffect(() => () => {
    if (cleanupRef.current) cleanupRef.current();
  }, []);

  const startResize = useCallback((e) => {
    e.preventDefault();
    const left = sidebarRef.current?.getBoundingClientRect().left ?? 0;
    const onMove = (ev) => {
      setWidth(clamp(ev.clientX - left, minWidth, maxWidth));
    };
    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      cleanupRef.current = null;
    };
    const onUp = () => cleanup();

    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = cleanup;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [maxWidth, minWidth]);

  return (
    <aside
      ref={sidebarRef}
      style={{
        width,
        minWidth,
        maxWidth,
        flexShrink: 0,
        background: 'var(--bg-tint)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        position: 'relative',
        '--left-sidebar-resizer-accent': accentColor,
        ...style,
      }}
    >
      <div
        className="left-sidebar-resizer"
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        title={`拖动${label}`}
        onMouseDown={startResize}
      />
      {children}
    </aside>
  );
}
