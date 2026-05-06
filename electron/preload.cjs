// 仅在打包后 (loadFile) 启用：告诉前端 API 走哪台 host/port，并暴露原生 IPC 桥。
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__KB_API_BASE__', 'http://127.0.0.1:5174');

// 自定义来源 / 选目录：原生 dialog（仅 Electron 可用，浏览器 dev 模式下走输入框降级）
contextBridge.exposeInMainWorld('__KB_PICK_DIR__', (opts) =>
  ipcRenderer.invoke('dialog:select-directory', opts || {}),
);
