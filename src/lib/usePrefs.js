import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kb-prefs';

const DEFAULTS = {
  density: 'standard', // 'breathe' | 'standard' | 'compact'
  fontSize: 15,        // 12-20
  sources: { learn: true, obsidian: true, work: true },
  behavior: {
    restoreLastFile: true,
    openBreakpointOnLearn: false,
    wikilinkSameWindow: true,
    renderMermaid: true,
  },
};

function readStored() {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      density: parsed.density || DEFAULTS.density,
      fontSize: parsed.fontSize || DEFAULTS.fontSize,
      sources: { ...DEFAULTS.sources, ...(parsed.sources || {}) },
      behavior: { ...DEFAULTS.behavior, ...(parsed.behavior || {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

// 缓存一份快照以便 getSnapshot 稳定返回同一引用（防止 React 死循环）
let snapshot = null;
function getSnapshot() {
  if (!snapshot) snapshot = readStored();
  return snapshot;
}

function write(next) {
  snapshot = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  applyToDocument(next);
  for (const fn of listeners) fn();
}

const listeners = new Set();

function applyToDocument(prefs) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--md-font-size', `${prefs.fontSize}px`);
  document.documentElement.dataset.density = prefs.density;
}

export function bootstrapPrefs() {
  snapshot = readStored();
  applyToDocument(snapshot);
}

export function usePrefs() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    getSnapshot,
    () => DEFAULTS,
  );
}

// 变更 helpers
export function setDensity(d) {
  if (!['breathe', 'standard', 'compact'].includes(d)) return;
  write({ ...snapshot, density: d });
}
export function setFontSize(px) {
  const v = Math.max(12, Math.min(20, Math.round(Number(px) || 15)));
  write({ ...snapshot, fontSize: v });
}
export function toggleSource(id, on) {
  write({ ...snapshot, sources: { ...snapshot.sources, [id]: !!on } });
}
export function setBehavior(key, value) {
  write({ ...snapshot, behavior: { ...snapshot.behavior, [key]: !!value } });
}

export { DEFAULTS };
