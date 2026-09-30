import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './primitives.jsx';

const STORAGE_KEY = 'kb-library-search-split-v1';
const HANDLE_WIDTH = 12;

function readRatio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw === null ? null : Number(raw);
    return value !== null && Number.isFinite(value) && value > 0 && value < 1 ? value : null;
  } catch {
    return null;
  }
}

function rememberRatio(value) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(value));
  } catch { /* 无存储权限时仍可调整当前窗口。 */ }
}

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export default function LibrarySplitPane({ children, focused = false }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const frameRef = useRef(null);
  const [ratio, setRatio] = useState(readRatio);
  const latestRatio = useRef(ratio);
  const [contentWidth, setContentWidth] = useState(0);
  const [stacked, setStacked] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  useLayoutEffect(() => {
    const element = containerRef.current;
    const media = window.matchMedia('(max-width: 760px)');
    const measure = () => {
      const style = getComputedStyle(element);
      setContentWidth(element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      setStacked(media.matches);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    media.addEventListener('change', measure);
    return () => { observer.disconnect(); media.removeEventListener('change', measure); };
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const previousCursor = document.body.style.cursor;
    const previousSelection = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelection;
    };
  }, [dragging]);

  useEffect(() => {
    if ((stacked || focused) && dragRef.current) {
      dragRef.current = null;
      setDragging(false);
      rememberRatio(latestRatio.current);
    }
  }, [stacked, focused]);

  const available = Math.max(1, contentWidth - HANDLE_WIDTH);
  const minimum = Math.min(220, available * 0.4);
  const maximum = Math.max(minimum, Math.min(available * 0.62, available - 340));
  const defaultWidth = clamp(available * 0.3, 260, 360);
  const width = clamp(ratio === null ? defaultWidth : available * ratio, minimum, maximum);
  const percent = Math.round(width / available * 100);

  const update = (nextWidth, persist = false) => {
    const next = clamp(nextWidth, minimum, maximum) / available;
    latestRatio.current = next;
    if (persist) {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      setRatio(next);
      rememberRatio(next);
    } else if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setRatio(latestRatio.current);
      });
    }
  };
  const reset = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    latestRatio.current = null;
    setRatio(null);
    rememberRatio(null);
  };
  const beginDrag = (event) => {
    if (event.button !== 0 || !event.isPrimary || stacked || focused || contentWidth === 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, startX: event.clientX, width, originalRatio: ratio };
    setDragging(true);
  };
  const endDrag = (event, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || (event.pointerId !== undefined && drag.id !== event.pointerId)) return;
    dragRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (cancelled) {
      latestRatio.current = drag.originalRatio;
      setRatio(drag.originalRatio);
    }
    else setRatio(latestRatio.current);
    rememberRatio(latestRatio.current);
    setDragging(false);
    if (event.currentTarget.hasPointerCapture?.(drag.id)) event.currentTarget.releasePointerCapture(drag.id);
  };
  const onKeyDown = (event) => {
    if (event.key === 'Escape' && dragRef.current) { event.preventDefault(); endDrag(event, true); return; }
    const step = event.shiftKey ? 40 : 10;
    const values = { ArrowLeft: width - step, ArrowRight: width + step, Home: minimum, End: maximum };
    if (event.key in values) { event.preventDefault(); update(values[event.key], true); }
    else if (event.key === 'Enter') { event.preventDefault(); reset(); }
  };

  return <div
    ref={containerRef}
    className={`library-split ${dragging ? 'is-resizing' : ''}`}
    style={!stacked && !focused && contentWidth > 0 ? { '--results-width': `${width}px` } : undefined}
  >
    {children[0]}
    {!stacked && !focused && <div
      className={`library-grip ${dragging ? 'dragging' : ''}`}
      role="separator"
      tabIndex={0}
      aria-label="调整搜索结果与正文宽度"
      aria-orientation="vertical"
      aria-controls="library-results-pane"
      aria-valuemin={Math.round(minimum / available * 100)}
      aria-valuemax={Math.round(maximum / available * 100)}
      aria-valuenow={percent}
      aria-valuetext={`搜索结果占 ${percent}%`}
      title="拖动调整宽度；双击或按 Enter 恢复默认；左右键微调"
      onPointerDown={beginDrag}
      onPointerMove={(event) => {
        if (dragRef.current?.id === event.pointerId) update(dragRef.current.width + event.clientX - dragRef.current.startX);
      }}
      onPointerUp={endDrag}
      onPointerCancel={(event) => endDrag(event, true)}
      onLostPointerCapture={endDrag}
      onDoubleClick={reset}
      onKeyDown={onKeyDown}
    ><Icon name="drag" size={17} /><span className="library-grip-value" aria-hidden="true">{percent}%</span></div>}
    {children[1]}
  </div>;
}
