import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Library from './pages/Library.jsx';
import { parentPath } from './lib/libraryState.js';

// 全局历史导航：Cmd/Ctrl + [ / ] → 浏览器 back/forward
// 三页面的 setSelectedPath 默认 push 模式，所以依次打开的 md 都会进历史栈
function useGlobalHistoryShortcuts() {
  useEffect(() => {
    const handler = (e) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.altKey || e.shiftKey) return;
      // 避开在文字编辑区按 — 输入框里 Cmd+[ 是 Safari 的 outdent
      const t = e.target;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      if (e.key === '[') {
        e.preventDefault();
        window.history.back();
      } else if (e.key === ']') {
        e.preventDefault();
        window.history.forward();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

function LibraryRedirect({ source, panel, retired }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (source) {
    params.set('view', 'browse');
    params.set('browse', source);
    params.set('scope', source);
    if (params.get('path')) {
      params.set('source', source);
      params.set('folder', parentPath(params.get('path')));
    }
  }
  if (panel) params.set('panel', panel);
  if (retired) {
    params.delete('source'); params.delete('path'); params.delete('q');
    params.set('retired', retired);
  }
  return <Navigate to={`/?${params}`} replace />;
}

export default function App() {
  useGlobalHistoryShortcuts();
  return <Routes>
    <Route path="/" element={<Library />} />
    <Route path="/search" element={<LibraryRedirect />} />
    <Route path="/work" element={<LibraryRedirect source="work" />} />
    <Route path="/custom" element={<LibraryRedirect source="custom" />} />
    <Route path="/prefs" element={<LibraryRedirect panel="settings" />} />
    <Route path="/learn" element={<LibraryRedirect retired="learn" />} />
    <Route path="/obsidian" element={<LibraryRedirect retired="obsidian" />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
