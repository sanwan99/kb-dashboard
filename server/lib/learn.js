import fs from 'node:fs/promises';
import path from 'node:path';
import { renderMarkdown } from './markdown.js';
import { parseStructured } from './learn-protocol.js';
import { readCache, writeCache } from './learn-cache.js';

// learn 进度解析：四级 fallback 调度器
//   1. structured  —— 顶部 ```kb-progress YAML 块（权威源）
//   2. markdown_fallback —— 旧的中文表格 + emoji 正则（历史兼容）
//   3. cache_fallback —— 上次成功结果，落盘 ~/.kb-dashboard/learn-progress-cache.json
//   4. unavailable —— 没有缓存，返回空骨架 + health=error
//
// 设计原则：parseProgress 总是返回结构化对象（含 health / source / warnings），
// 路由层不需要 try/catch 单独处理"格式坏"——除非文件本身读不到才抛。

const STAGE_ROW = /^\|\s*(\d+)\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

// 60 天剪裁：activityDates 只看近 60 天，足够 30 天热图 + 连击天数；
// 防止 progress.md 跑半年后 activity 膨胀到上百条
const ACTIVITY_WINDOW_DAYS = 60;

/**
 * 解析 learn 源根下的 progress.md，返回带健康状态的结构化数据。
 * 文件不存在或读不到时抛错（这是真故障，不是格式漂移）。
 */
export async function parseProgress(root) {
  const filePath = path.join(root, 'progress.md');
  const stat = await fs.stat(filePath);
  const raw = await fs.readFile(filePath, 'utf8');
  const fileMeta = {
    path: 'progress.md',
    mtime: stat.mtime.toISOString(),
    size: stat.size,
  };

  // —— 路径 1：结构化块 ——
  const structured = parseStructured(raw);
  if (structured && structured.progress) {
    const errorWarnings = structured.warnings.filter((w) => w.level === 'error');
    const warnWarnings = structured.warnings.filter((w) => w.level === 'warn');
    const health = errorWarnings.length ? 'error' : (warnWarnings.length ? 'warn' : 'ok');
    const out = buildResponseFromStructured(structured.progress, fileMeta, {
      health,
      source: 'structured',
      schemaVersion: structured.progress.schemaVersion,
      warnings: structured.warnings,
      cachedAt: null,
    });
    await writeCache({
      source: 'structured',
      schemaVersion: structured.progress.schemaVersion,
      progress: structured.progress,
    });
    return out;
  }

  // 块存在但 schema 校验失败时，warnings 要透到下游响应里
  const structuredWarnings = structured ? structured.warnings : [];

  // —— 路径 2：legacy 正则降级 ——
  const legacy = parseLegacy(raw);
  if (legacy) {
    const warnings = [
      ...(structured == null
        ? [{ level: 'warn', code: 'STRUCTURED_BLOCK_MISSING',
            message: 'progress.md 顶部缺少 kb-progress 围栏块，已退到旧正则解析（强烈建议补回）',
            at: '' }]
        : structuredWarnings),
    ];
    const out = buildResponseFromLegacy(legacy, raw, fileMeta, {
      health: 'warn',
      source: 'markdown_fallback',
      schemaVersion: null,
      warnings,
      cachedAt: null,
    });
    await writeCache({
      source: 'markdown_fallback',
      schemaVersion: null,
      progress: legacy.progressForCache,
    });
    return out;
  }

  // —— 路径 3：缓存兜底 ——
  const cached = await readCache();
  if (cached && cached.progress) {
    const warnings = [
      ...structuredWarnings,
      { level: 'error', code: 'BOTH_PARSERS_FAILED',
        message: 'kb-progress 块和 legacy 正则均无法解析 progress.md，已退到上次成功状态',
        at: '' },
    ];
    if (cached.source === 'structured') {
      const out = buildResponseFromStructured(cached.progress, fileMeta, {
        health: 'error',
        source: 'cache_fallback',
        schemaVersion: cached.schemaVersion ?? null,
        warnings,
        cachedAt: cached.cachedAt,
      });
      return out;
    }
    // legacy 缓存：progressForCache 是已经算好的扁平字段
    return {
      ...emptyProgressFields(),
      ...cached.progress,
      ...fileMeta,
      health: 'error',
      source: 'cache_fallback',
      schemaVersion: null,
      warnings,
      cachedAt: cached.cachedAt,
    };
  }

  // —— 路径 4：完全不可用 ——
  return {
    ...emptyProgressFields(),
    ...fileMeta,
    health: 'error',
    source: 'unavailable',
    schemaVersion: null,
    warnings: [
      ...structuredWarnings,
      { level: 'error', code: 'NO_DATA',
        message: 'progress.md 解析失败且无可用缓存，请在文件顶部补回 kb-progress 块',
        at: '' },
    ],
    cachedAt: null,
  };
}

// ─────────────────────────────────────────────────────────
// 路径 2：legacy 正则解析（保留旧逻辑作为降级）
// ─────────────────────────────────────────────────────────

function determineLegacyStatus(cell) {
  if (cell.includes('✅')) return 'done';
  if (cell.includes('🚧')) return 'in_progress';
  if (cell.includes('⬜')) return 'pending';
  return 'pending';
}

function parseLegacy(raw) {
  const stages = [];
  const lines = raw.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (!inTable) {
      if (/^\|\s*阶段\s*\|/.test(line)) inTable = true;
      continue;
    }
    if (/^\|[-:\s]+\|/.test(line)) continue;
    if (!line.trim().startsWith('|')) break;
    const m = line.match(STAGE_ROW);
    if (!m) continue;
    const [, idx, name, statusCell, target, date] = m;
    const internal = determineLegacyStatus(statusCell);
    stages.push({
      id: String(idx).padStart(2, '0'),
      index: parseInt(idx, 10),
      title: name.trim(),
      // legacy 路径直接输出前端约定形式
      status: internal === 'in_progress' ? 'in-progress' : internal,
      statusText: statusCell.trim(),
      target: target.trim(),
      completedAt: date.trim() === '-' ? null : date.trim(),
    });
  }
  if (stages.length === 0) return null; // legacy 也失败

  // 当前断点段落
  let currentIndex = null;
  let currentStageText = null;
  let breakpointHtml = null;
  const bpStart = raw.indexOf('## 当前断点');
  if (bpStart !== -1) {
    const after = raw.slice(bpStart);
    const nextH2 = after.slice(2).search(/\n## /);
    const section = nextH2 === -1 ? after : after.slice(0, nextH2 + 2);
    const stageMatch = section.match(/\*\*阶段\*\*[：:]\s*(.+?)\n/);
    if (stageMatch) {
      currentStageText = stageMatch[1].trim();
      const idxMatch = currentStageText.match(/^0?(\d+)/);
      if (idxMatch) currentIndex = parseInt(idxMatch[1], 10);
    }
    const body = section.replace(/^## 当前断点\s*\n?/, '');
    breakpointHtml = renderMarkdown(body).html;
  }

  if (currentIndex != null) {
    const cur = stages.find((s) => s.index === currentIndex);
    if (cur && cur.status === 'pending') cur.status = 'in-progress';
  }

  // 每日学习记录（### YYYY-MM-DD）
  const activityDates = [];
  const seen = new Set();
  for (const m of raw.matchAll(/^###\s+(\d{4})-(\d{2})-(\d{2})/gm)) {
    const d = `${m[1]}-${m[2]}-${m[3]}`;
    if (!seen.has(d)) { seen.add(d); activityDates.push(d); }
  }
  activityDates.sort();

  // 给前端的字段（保持原有形状）
  const totalStages = stages.length;
  const doneStages = stages.filter((s) => s.status === 'done').length;
  const progressPct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;
  const streak = computeStreak(activityDates);
  const recent30 = buildRecent30(activityDates);

  // legacy 路径下序列化给缓存的 payload：扁平字段，cache_fallback 直接展开即可
  const progressForCache = {
    stages: stages.map((s) => ({
      id: s.id, title: s.title, status: s.status, target: s.target, completedAt: s.completedAt,
    })),
    currentIndex,
    currentStageText,
    breakpointHtml,
    progressPct,
    totalStages,
    doneStages,
    activityDates,
    streak,
    recent30,
  };

  return {
    stages,
    currentIndex,
    currentStageText,
    breakpointHtml,
    progressPct,
    totalStages,
    doneStages,
    activityDates,
    streak,
    recent30,
    progressForCache,
  };
}

// ─────────────────────────────────────────────────────────
// 响应构造：把结构化 progress / legacy 结果塑形为前端期望的扁平字段
// ─────────────────────────────────────────────────────────

function buildResponseFromStructured(progress, fileMeta, envelope) {
  const stages = progress.stages.map((s) => ({
    id: s.id,
    index: parseInt(s.id, 10),
    title: s.title,
    // 内部 schema 用 in_progress（YAML 友好），输出层转 in-progress 跟前端约定对齐
    status: s.status === 'in_progress' ? 'in-progress' : s.status,
    statusText: STATUS_TEXT[s.status] || s.status,
    target: s.target,
    completedAt: s.completedAt,
  }));

  const totalStages = stages.length;
  const doneStages = stages.filter((s) => s.status === 'done').length;
  const progressPct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

  const currentIndex = parseInt(progress.currentStageId, 10);
  const currentStage = stages.find((s) => s.id === progress.currentStageId);
  const currentStageText = composeCurrentStageText(progress, currentStage);

  // 把 current.summary + current.next 拼一段 markdown，渲染成 breakpointHtml
  const breakpointMd = composeBreakpointMd(progress);
  const breakpointHtml = breakpointMd ? renderMarkdown(breakpointMd).html : null;

  // activity → activityDates（去重 + 排序），仅保留近 60 天
  const cutoff = daysAgoYMD(ACTIVITY_WINDOW_DAYS);
  const activityDates = uniqSorted(
    progress.activity
      .map((a) => a.date)
      .filter((d) => d >= cutoff)
  );
  const streak = computeStreak(activityDates);
  const recent30 = buildRecent30(activityDates);

  return {
    ...fileMeta,
    ...envelope,
    stages,
    currentIndex,
    currentStageText,
    breakpointHtml,
    progressPct,
    totalStages,
    doneStages,
    activityDates,
    streak,
    recent30,
  };
}

function buildResponseFromLegacy(legacy, raw, fileMeta, envelope) {
  return {
    ...fileMeta,
    ...envelope,
    stages: legacy.stages.map((s) => ({
      id: s.id,
      index: s.index,
      title: s.title,
      status: s.status,
      statusText: s.statusText,
      target: s.target,
      completedAt: s.completedAt,
    })),
    currentIndex: legacy.currentIndex,
    currentStageText: legacy.currentStageText,
    breakpointHtml: legacy.breakpointHtml,
    progressPct: legacy.progressPct,
    totalStages: legacy.totalStages,
    doneStages: legacy.doneStages,
    activityDates: legacy.activityDates,
    streak: legacy.streak,
    recent30: legacy.recent30,
  };
}

const STATUS_TEXT = {
  done: '✅ 已完成',
  in_progress: '🚧 进行中',
  pending: '⬜ 未开始',
  optional: '⬜ 可选',
};

function composeCurrentStageText(progress, currentStage) {
  if (!currentStage) {
    return progress.currentStageId ? `阶段 ${progress.currentStageId}` : null;
  }
  const sub = progress.currentSubstageId ? ` — ${progress.currentSubstageId}` : '';
  return `${currentStage.id} ${currentStage.title}${sub}`;
}

function composeBreakpointMd(progress) {
  const parts = [];
  const summary = progress.current?.summary?.trim();
  if (summary) parts.push(summary);
  const next = (progress.current?.next || []).filter(Boolean);
  if (next.length) {
    parts.push('**下次继续**：');
    for (const n of next) parts.push(`- ${n}`);
  }
  if (progress.current?.updatedAt) {
    parts.push(`\n*更新于 ${progress.current.updatedAt}*`);
  }
  return parts.join('\n');
}

function emptyProgressFields() {
  return {
    stages: [],
    currentIndex: null,
    currentStageText: null,
    breakpointHtml: null,
    progressPct: 0,
    totalStages: 0,
    doneStages: 0,
    activityDates: [],
    streak: 0,
    recent30: buildRecent30([]),
  };
}

// ─────────────────────────────────────────────────────────
// 日期工具
// ─────────────────────────────────────────────────────────

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoYMD(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

function uniqSorted(arr) {
  return [...new Set(arr)].sort();
}

function computeStreak(dates) {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const today = new Date();
  let cur = new Date(today);
  if (!set.has(toYMD(cur))) cur.setDate(cur.getDate() - 1);
  let days = 0;
  while (set.has(toYMD(cur))) {
    days++;
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

function buildRecent30(dates) {
  const set = new Set(dates);
  const out = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const ymd = toYMD(d);
    out.push({ date: ymd, active: set.has(ymd) });
  }
  return out;
}
