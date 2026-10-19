import { useSyncExternalStore } from 'react';
import { syncWindowMaterial } from './windowMaterial.js';

const STORAGE_KEY = 'kb-prefs';

const DEFAULTS = {
  surface: 'liquid', // 'liquid' | 'flat'
  glassIntensity: 40, // 0-100
  windowOpacity: 10, // 0-100
  readerOpacity: 2, // 0-100
  density: 'standard', // 'breathe' | 'standard' | 'compact'
  fontSize: 16,        // 12-20
  sources: { work: true, custom: true },
  behavior: {
    restoreLastFile: true,
    openBreakpointOnLearn: false,
    wikilinkSameWindow: true,
    renderMermaid: true,
  },
};

function normalizeGlassIntensity(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : DEFAULTS.glassIntensity;
}

function normalizeReaderOpacity(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : DEFAULTS.readerOpacity;
}

function normalizeWindowOpacity(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : DEFAULTS.windowOpacity;
}

function readStored() {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      surface: parsed.surface === 'flat' ? 'flat' : DEFAULTS.surface,
      glassIntensity: normalizeGlassIntensity(parsed.glassIntensity),
      windowOpacity: normalizeWindowOpacity(parsed.windowOpacity),
      readerOpacity: normalizeReaderOpacity(parsed.readerOpacity),
      density: parsed.density || DEFAULTS.density,
      fontSize: parsed.fontSize || DEFAULTS.fontSize,
      sources: { work: parsed.sources?.work !== false, custom: parsed.sources?.custom !== false },
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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* 仍应用当前会话设置。 */ }
  applyToDocument(next);
  for (const fn of listeners) fn();
}

const listeners = new Set();

function applyToDocument(prefs) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--md-font-size', `${prefs.fontSize}px`);
  document.documentElement.dataset.density = prefs.density;
  document.documentElement.dataset.surface = prefs.surface;
  const intensity = normalizeGlassIntensity(prefs.glassIntensity);
  document.documentElement.dataset.glassIntensity = String(intensity);
  document.documentElement.dataset.glassBoost = intensity >= 70 ? 'high' : 'normal';
  document.documentElement.style.setProperty('--glass-level', String(intensity / 100));
  document.documentElement.style.setProperty('--glass-boost', String(Math.max(0, (intensity - 40) / 60)));
  document.documentElement.style.setProperty('--glass-reader-opacity', String(normalizeReaderOpacity(prefs.readerOpacity) / 100));
  document.documentElement.style.setProperty('--glass-window-opacity', String(normalizeWindowOpacity(prefs.windowOpacity) / 100));
  syncWindowMaterial();
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
export function setSurface(surface) {
  if (!['liquid', 'flat'].includes(surface)) return;
  write({ ...getSnapshot(), surface });
}
export function setGlassIntensity(value) {
  write({ ...getSnapshot(), glassIntensity: normalizeGlassIntensity(Number(value)) });
}
export function setReaderOpacity(value) {
  write({ ...getSnapshot(), readerOpacity: normalizeReaderOpacity(Number(value)) });
}
export function setWindowOpacity(value) {
  write({ ...getSnapshot(), windowOpacity: normalizeWindowOpacity(Number(value)) });
}
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
