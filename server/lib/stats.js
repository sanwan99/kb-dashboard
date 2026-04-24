import fg from 'fast-glob';
import path from 'node:path';
import { SOURCES, SOURCES_BY_ID } from './sources.js';
import { parseProgress } from './learn.js';

const GLOB_PATTERNS = ['**/*.md', '**/*.markdown'];
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

// 扫描一个源下所有 md（含 stat）
async function scanMd(sourceId) {
  const src = SOURCES_BY_ID[sourceId];
  const entries = await fg(GLOB_PATTERNS, {
    cwd: src.root,
    ignore: GLOB_IGNORE,
    stats: true,
    followSymbolicLinks: true,
    onlyFiles: true,
    suppressErrors: true, // 权限问题等不崩
  });
  // fast-glob stats:true 返回 { name, path, stats: { size, mtimeMs, ... } }
  return entries.map((e) => ({
    name: e.name,
    path: e.path, // 相对 cwd
    size: e.stats.size,
    mtime: new Date(e.stats.mtimeMs),
  }));
}

const latest = (files) =>
  files.length ? new Date(Math.max(...files.map((f) => f.mtime.getTime()))).toISOString() : null;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Obsidian：按 PARA 顶层目录分组
function groupByTopDir(files) {
  const map = new Map();
  for (const f of files) {
    const top = f.path.split('/')[0];
    if (!top || top === f.path) continue; // 顶层 md 文件跳过
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
    if (segs.length >= 4 && segs[1] === 'md' && segs[2] === 'codex' && segs[3] === 'current') {
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

// 聚合首页数据
export async function buildHomeOverview() {
  const [learnFiles, obsidianFiles, workFiles] = await Promise.all([
    scanMd('learn'),
    scanMd('obsidian'),
    scanMd('work'),
  ]);

  const all = [...learnFiles, ...obsidianFiles, ...workFiles];
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
  };
}
