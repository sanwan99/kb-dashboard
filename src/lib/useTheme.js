import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'kb-theme';
// 'light' | 'dark' | 'system'

function resolveStored() {
  if (typeof window === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

function resolveSystem() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function displayOf(mode) {
  return mode === 'system' ? resolveSystem() : mode;
}

function apply(mode) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = displayOf(mode);
}

const listeners = new Set();
function notify() { for (const fn of listeners) fn(); }

// 系统配色变化时，如果当前是 'system' 模式，重新应用
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => {
    if (resolveStored() === 'system') {
      apply('system');
      notify();
    }
  });
}

export function setTheme(mode) {
  if (mode !== 'light' && mode !== 'dark' && mode !== 'system') return;
  localStorage.setItem(STORAGE_KEY, mode);
  apply(mode);
  notify();
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    resolveStored,
    () => 'system',
  );
  return {
    theme,
    resolvedTheme: displayOf(theme),
    setTheme,
    toggle: () => setTheme(displayOf(theme) === 'dark' ? 'light' : 'dark'),
  };
}

export function bootstrapTheme() {
  apply(resolveStored());
}
