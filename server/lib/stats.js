import fg from 'fast-glob';
import path from 'node:path';
import { SOURCES, SOURCES_BY_ID } from './sources.js';
import { parseProgress } from './learn.js';
import { listMounts } from './custom-sources.js';
import { MARKDOWN_EXTS, READABLE_GLOB_PATTERNS } from './file-types.js';

const GLOB_IGNORE = [
  '**/.git/**',
  '**/.obsidian/**',
  '**/node_modules/**',
  '**/target/**',
  '**/dist/**',
  '**/.vite/**',
  '**/.codex_tmp/**',
  '**/.claude/**',
  '**/.trash/**',
  '**/*_副本/**',
];

// 扫描一个源下所有可读文件（含 stat）。
// custom 源：遍历所有可用挂载点，path 字段拼 mountId 前缀。
async function scanReadable(sourceId) {
  const src = SOURCES_BY_ID[sourceId];
  if (!src) return [];

  const targets = [];
  if (src.multi) {
    for (const m of listMounts()) {
      if (!m.available) continue;
      targets.push({ cwd: m.realRoot, prefix: m.id, mountId: m.id });
    }
  } else {
    targets.push({ cwd: src.root, prefix: '', mountId: null });
  }

  const out = [];
  for (const t of targets) {
    let entries;
    try {
      entries = await fg(READABLE_GLOB_PATTERNS, {
        cwd: t.cwd,
        ignore: GLOB_IGNORE,
        stats: true,
        followSymbolicLinks: true,
        onlyFiles: true,
        suppressErrors: true,
      });
    } catch {
      continue;
    }
    for (const e of entries) {
      const relPath = t.prefix
        ? path.posix.join(t.prefix, e.path.split(path.sep).join('/'))
        : e.path;
      out.push({
        name: e.name,
        path: relPath,
        ext: path.extname(e.name).slice(1).toLowerCase(),
        size: e.stats.size,
        mtime: new Date(e.stats.mtimeMs),
        mountId: t.mountId,
      });
    }
  }
  return out;
}

const latest = (files) =>
  files.length ? new Date(Math.max(...files.map((f) => f.mtime.getTime()))).toISOString() : null;

// 某源下最近修改的可读文件，按 mtime 倒序
export async function listRecent(source, limit = 50) {
  const files = await scanReadable(source);
  files.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  return files.slice(0, limit).map((f) => ({
    name: f.name,
    path: f.path,
    size: f.size,
    mtime: f.mtime.toISOString(),
  }));
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Obsidian：按 PARA 顶层目录分组
function groupByTopDir(files) {
  const map = new Map();
  for (const f of files) {
    const top = f.path.split('/')[0];
    if (!top || top === f.path) continue; // 顶层文件跳过
    if (!map.has(top)) map.set(top, []);
    map.get(top).push(f);
  }
  return [...map.entries()]
    .map(([name, fs]) => ({
      name,
      fileCount: fs.length,
      latestMtime: latest(fs),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

// Work：按项目分组，识别 md/codex/current 活跃任务
function groupByProject(files) {
  const map = new Map();
  for (const f of files) {
    const segs = f.path.split('/');
    const proj = segs[0];
    if (!proj || proj === f.path) continue;
    if (!map.has(proj)) map.set(proj, { files: [], active: [] });
    map.get(proj).files.push(f);
    if (segs.length >= 4 && segs[1] === 'md' && segs[2] === 'codex' && segs[3] === 'current' && MARKDOWN_EXTS.has(f.ext)) {
      map.get(proj).active.push(f);
    }
  }
  return [...map.entries()]
    .map(([name, g]) => ({
      name,
      fileCount: g.files.length,
      activeTaskCount: g.active.length,
      latestMtime: latest(g.files),
      latestActive: g.active.length ? latest(g.active) : null,
    }))
    .sort((a, b) => b.activeTaskCount - a.activeTaskCount || a.name.localeCompare(b.name, 'zh-CN'));
}

// custom：按挂载点分组
function groupByMount(files, mounts) {
  const map = new Map(mounts.map((m) => [m.id, []]));
  for (const f of files) {
    if (!f.mountId) continue;
    if (!map.has(f.mountId)) map.set(f.mountId, []);
    map.get(f.mountId).push(f);
  }
  return mounts.map((m) => {
    const fs = map.get(m.id) || [];
    return {
      id: m.id,
      name: m.name,
      realRoot: m.realRoot,
      available: m.available,
      fileCount: fs.length,
      latestMtime: latest(fs),
    };
  });
}

// 聚合首页数据
export async function buildHomeOverview() {
  const [learnFiles, obsidianFiles, workFiles, customFiles] = await Promise.all([
    scanReadable('learn'),
    scanReadable('obsidian'),
    scanReadable('work'),
    scanReadable('custom'),
  ]);
  const customMounts = listMounts();

  const all = [...learnFiles, ...obsidianFiles, ...workFiles, ...customFiles];
  const now = Date.now();
  const editedRecent = all.filter((f) => now - f.mtime.getTime() < SEVEN_DAYS_MS).length;

  // Learn：review 专题列表（review/<topic>/ 下的一级 dir 名）
  const reviewTopics = [
    ...new Set(
      learnFiles
        .filter((f) => f.path.startsWith('review/'))
        .map((f) => f.path.split('/')[1])
        .filter(Boolean),
    ),
  ].map((name) => {
    const topicFiles = learnFiles.filter((f) => f.path.startsWith(`review/${name}/`));
    return {
      name,
      fileCount: topicFiles.length,
      latestMtime: latest(topicFiles),
    };
  });

  let progress = null;
  try {
    progress = await parseProgress(SOURCES_BY_ID.learn.root);
  } catch {
    progress = null;
  }

  return {
    global: {
      totalFiles: all.length,
      editedRecent,
    },
    sources: SOURCES.map((s) => ({
      id: s.id,
      label: s.label,
      displayPath: s.displayPath,
      color: s.color,
    })),
    learn: {
      fileCount: learnFiles.length,
      latestMtime: latest(learnFiles),
      progress,
      reviewTopics,
    },
    obsidian: {
      fileCount: obsidianFiles.length,
      latestMtime: latest(obsidianFiles),
      folders: groupByTopDir(obsidianFiles),
    },
    work: {
      fileCount: workFiles.length,
      latestMtime: latest(workFiles),
      projects: groupByProject(workFiles),
    },
    custom: {
      mountCount: customMounts.length,
      fileCount: customFiles.length,
      latestMtime: latest(customFiles),
      mounts: groupByMount(customFiles, customMounts),
    },
  };
}
