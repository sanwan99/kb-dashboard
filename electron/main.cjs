// Electron 主进程（CommonJS）
// dev：加载 Vite dev server，由 `npm run dev` 并发起后端
// prod：loadFile dist + 主进程内启动 Fastify（in-process）
const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const isDev = !app.isPackaged;

// 打包后 data/ 不在 asar 里，统一指向本机开发目录的软链位置
if (!isDev) {
  process.env.KB_DATA_DIR = path.join(os.homedir(), 'work', 'sanwan', 'kb-dashboard', 'data');
}

function ensureDataOrWarn() {
  if (isDev) return true;
  const dataDir = process.env.KB_DATA_DIR;
  const missing = ['learn', 'obsidian', 'work'].filter(
    (id) => !fs.existsSync(path.join(dataDir, id)),
  );
  if (missing.length > 0) {
    dialog.showErrorBox(
      '缺少源软链',
      `打开 ${dataDir} 后请确认下列软链存在：\n${missing.map((m) => '  data/' + m).join('\n')}\n\n可在项目目录下运行 ./start.sh 自动建好。`,
    );
    return false;
  }
  return true;
}

async function startApi() {
  const serverPath = path.join(__dirname, '..', 'server', 'index.js');
  const { pathToFileURL } = require('node:url');
  await import(pathToFileURL(serverPath).href);
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name || '个人知识库',
          submenu: [
            { role: 'about' }, { type: 'separator' },
            { role: 'services' }, { type: 'separator' },
            { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
            { type: 'separator' }, { role: 'quit' },
          ],
        }]
      : []),
    { label: '编辑', submenu: [
      { role: 'undo', label: '撤销' }, { role: 'redo', label: '重做' }, { type: 'separator' },
      { role: 'cut', label: '剪切' }, { role: 'copy', label: '复制' }, { role: 'paste', label: '粘贴' },
      { role: 'selectAll', label: '全选' },
    ]},
    { label: '视图', submenu: [
      { role: 'reload', label: '重新加载' }, { role: 'forceReload', label: '强制重新加载' },
      { role: 'toggleDevTools', label: '开发者工具' }, { type: 'separator' },
      { role: 'resetZoom', label: '实际大小' }, { role: 'zoomIn', label: '放大' }, { role: 'zoomOut', label: '缩小' },
      { type: 'separator' }, { role: 'togglefullscreen', label: '全屏' },
    ]},
    { label: '窗口', submenu: [
      { role: 'minimize', label: '最小化' }, { role: 'zoom', label: '缩放' }, { role: 'close', label: '关闭' },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const webPreferences = {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false, // prod 下需要 preload 使用 contextBridge（sandbox:true 时限制严格）
  };
  // 仅 prod 需要 preload 注入 API_BASE
  if (!isDev) {
    webPreferences.preload = path.join(__dirname, 'preload.cjs');
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 980,
    minHeight: 620,
    backgroundColor: '#FAF9F5',
    title: '个人知识库',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences,
  });

  if (isDev) {
    win.loadURL(DEV_URL);
    win.webContents.on('did-fail-load', (_e, _c, desc) => {
      if (desc !== 'ERR_ABORTED') setTimeout(() => win.loadURL(DEV_URL), 600);
    });
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 兜底：阻止任何 navigate 切到 file:// 其他路径（防止点 md 里的绝对路径链接导致白屏）
  win.webContents.on('will-navigate', (event, url) => {
    const current = win.webContents.getURL();
    if (url === current) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
  });
}

// IPC：自定义来源 - 选目录（Electron 模式下走原生 dialog）
ipcMain.handle('dialog:select-directory', async (_evt, opts = {}) => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  const r = await dialog.showOpenDialog(win, {
    title: opts.title || '选择目录',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: opts.defaultPath || os.homedir(),
  });
  if (r.canceled || !r.filePaths?.length) return { canceled: true };
  return { canceled: false, path: r.filePaths[0] };
});

app.whenReady().then(async () => {
  buildMenu();
  if (!isDev) {
    if (!ensureDataOrWarn()) { app.quit(); return; }
    try { await startApi(); } catch (err) {
      dialog.showErrorBox('后端启动失败', String(err?.message || err));
      app.quit();
      return;
    }
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
