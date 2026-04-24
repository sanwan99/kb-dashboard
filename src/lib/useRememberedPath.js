import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// 记住当前页"上次打开的 md"路径。
// 规则：
//   1. URL `?path=...` 优先，进来时带的深链不会被 localStorage 覆盖。
//   2. URL 没有 path 时，用 localStorage 回填并 `replace`，不污染浏览器历史。
//   3. URL 变化时，同步写回 localStorage（为 null/清空则不删除，保持"上次的记忆"）。
export default function useRememberedPath(storageKey) {
  const [sp, setSp] = useSearchParams();
  const selected = sp.get('path') || null;

  // mount 一次：URL 没 path 就从 localStorage 回填
  useEffect(() => {
    if (selected) return;
    if (typeof localStorage === 'undefined') return;
    try {
      const last = localStorage.getItem(storageKey);
      if (last) setSp({ path: last }, { replace: true });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // selected 变化时写回
  useEffect(() => {
    if (!selected) return;
    if (typeof localStorage === 'undefined') return;
    try { localStorage.setItem(storageKey, selected); } catch { /* ignore */ }
  }, [selected, storageKey]);

  const setSelected = (p) => setSp(p ? { path: p } : {});
  return [selected, setSelected];
}
