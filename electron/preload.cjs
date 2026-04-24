// 只在打包后 (loadFile) 启用：告诉前端 API 走哪台 host/port
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('__KB_API_BASE__', 'http://127.0.0.1:5174');
