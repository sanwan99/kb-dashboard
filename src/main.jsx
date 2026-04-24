import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { bootstrapTheme } from './lib/useTheme.js';
import { bootstrapPrefs } from './lib/usePrefs.js';
import './styles/theme.css';

bootstrapTheme();
bootstrapPrefs();

// Electron on macOS 用 hiddenInset 标题栏，红绿灯压在顶栏左上角。
// 打上平台标记，让 CSS 给顶栏左侧预留空间 + 开启窗口拖拽区。
if (
  typeof navigator !== 'undefined' &&
  /Electron/i.test(navigator.userAgent) &&
  /Mac/i.test(navigator.platform)
) {
  document.documentElement.dataset.kbPlatform = 'electron-mac';
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
