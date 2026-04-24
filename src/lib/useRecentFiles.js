import { useEffect, useState } from 'react';

// 记录当前页最近打开的 md 路径列表。
// 规则：
//   - 每次 path 变化时 unshift + 去重 + 截断到 capacity
//   - 持久化到 localStorage（storageKey，数组 JSON）
//   - 返回 [recent, clearRecent]
export default function useRecentFiles(storageKey, currentPath, capacity = 15) {
  const read = () => {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string').slice(0, capacity) : [];
    } catch { return []; }
  };
  const [recent, setRecent] = useState(read);

  useEffect(() => {
    if (!currentPath) return;
    setRecent((prev) => {
      if (prev[0] === currentPath) return prev;
      const next = [currentPath, ...prev.filter((p) => p !== currentPath)].slice(0, capacity);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(next));
        }
      } catch { /* ignore */ }
      return next;
    });
  }, [currentPath, storageKey, capacity]);

  const clearRecent = () => {
    setRecent([]);
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  return [recent, clearRecent];
}
