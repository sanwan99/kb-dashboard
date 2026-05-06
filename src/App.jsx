import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LearnSpacious from './pages/LearnSpacious.jsx';
import Obsidian from './pages/Obsidian.jsx';
import Work from './pages/Work.jsx';
import Custom from './pages/Custom.jsx';
import Search from './pages/Search.jsx';
import Prefs from './pages/Prefs.jsx';

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

export default function App() {
  useGlobalHistoryShortcuts();
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn" element={<LearnSpacious />} />
      <Route path="/obsidian" element={<Obsidian />} />
      <Route path="/work" element={<Work />} />
      <Route path="/custom" element={<Custom />} />
      <Route path="/search" element={<Search />} />
      <Route path="/prefs" element={<Prefs />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
