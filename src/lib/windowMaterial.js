export function syncWindowMaterial() {
  if (typeof window === 'undefined' || !window.__KB_WINDOW_MATERIAL__?.nativeBackdrop) return;
  const root = document.documentElement;
  const surface = root.dataset.surface === 'flat' ? 'flat' : 'liquid';
  const theme = root.dataset.themeMode || 'system';
  const reducedTransparency = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  root.dataset.nativeBackdrop = String(surface === 'liquid' && !reducedTransparency);
  window.__KB_WINDOW_MATERIAL__.set({ surface, theme, reducedTransparency });
}

export function bootstrapWindowMaterial() {
  if (!window.__KB_WINDOW_MATERIAL__?.nativeBackdrop) return;
  window.matchMedia('(prefers-reduced-transparency: reduce)').addEventListener('change', syncWindowMaterial);
  syncWindowMaterial();
}
