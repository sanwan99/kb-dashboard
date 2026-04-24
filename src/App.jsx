import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import LearnSpacious from './pages/LearnSpacious.jsx';
import Obsidian from './pages/Obsidian.jsx';
import Work from './pages/Work.jsx';
import Search from './pages/Search.jsx';
import Prefs from './pages/Prefs.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/learn" element={<LearnSpacious />} />
      <Route path="/obsidian" element={<Obsidian />} />
      <Route path="/work" element={<Work />} />
      <Route path="/search" element={<Search />} />
      <Route path="/prefs" element={<Prefs />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
