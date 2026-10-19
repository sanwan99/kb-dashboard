// 为桌面窗口暴露 API 地址和限定用途的原生 IPC 桥。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__KB_API_BASE__', 'http://127.0.0.1:5174');

contextBridge.exposeInMainWorld('__KB_WINDOW_MATERIAL__', {
  nativeBackdrop: process.platform === 'darwin',
  set: (options) => ipcRenderer.send('window:material', options),
});

// 自定义来源 / 选目录：原生 dialog（仅 Electron 可用，浏览器 dev 模式下走输入框降级）
contextBridge.exposeInMainWorld('__KB_PICK_DIR__', (opts) =>
  ipcRenderer.invoke('dialog:select-directory', opts || {}),
);
