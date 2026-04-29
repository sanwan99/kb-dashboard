import { getCachedSources, openWithExternal } from './api.js';

// 调起外部应用 / Finder / 复制路径 — 给右键菜单和工具栏共用

export function openWithApp({ source, path: relPath, absPath, app = 'typora' }) {
  return openWithExternal({ action: 'open', app, source, path: relPath, absPath });
}

export function revealInFinder({ source, path: relPath, absPath }) {
  return openWithExternal({ action: 'reveal', source, path: relPath, absPath });
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* 退到下面的 fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function buildAbsPathFor(source, relPath) {
  try {
    const sources = await getCachedSources();
    const s = sources.find((x) => x.id === source);
    if (!s || !s.realRoot) return null;
    return relPath ? `${s.realRoot}/${relPath}` : s.realRoot;
  } catch {
    return null;
  }
}

// 工厂：给一个 row 生成标准菜单项
//   source: 'learn' | 'obsidian' | 'work'
//   relPath: 该源下的相对路径
//   isDir: 是否目录（影响"用 Typora 打开"的可用性）
export function buildFileMenuItems({ source, relPath, isDir = false }) {
  if (!source || !relPath) return [];
  const handle = (action) => action().catch((err) => {
    // eslint-disable-next-line no-alert
    window.alert(err?.message || String(err));
  });
  return [
    {
      label: '用 Typora 打开',
      icon: 'play',
      disabled: isDir,
      onClick: () => handle(() => openWithApp({ source, path: relPath })),
    },
    {
      label: '在 Finder 中显示',
      icon: 'folder',
      onClick: () => handle(() => revealInFinder({ source, path: relPath })),
    },
    { divider: true },
    {
      label: '复制相对路径',
      icon: 'link',
      onClick: () => copyToClipboard(relPath),
    },
    {
      label: '复制绝对路径',
      icon: 'link',
      onClick: async () => {
        const abs = await buildAbsPathFor(source, relPath);
        if (abs) await copyToClipboard(abs);
      },
    },
  ];
}
