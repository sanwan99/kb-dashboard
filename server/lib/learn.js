import fs from 'node:fs/promises';
import path from 'node:path';
import { renderMarkdown } from './markdown.js';

// 阶段行：| 01 Spring AI 基础 | ✅ 已完成 | 完成标志 | 2026-04-14 |
const STAGE_ROW = /^\|\s*(\d+)\s+(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/;

function determineStatus(cell) {
  if (cell.includes('✅')) return 'done';
  if (cell.includes('🚧')) return 'in-progress';
  if (cell.includes('⬜')) return 'pending';
  return 'pending';
}

/**
 * 解析 learn 源根下的 progress.md。
 * 返回结构稳定，找不到的段落给 null，别崩。
 */
export async function parseProgress(root) {
  const filePath = path.join(root, 'progress.md');
  const stat = await fs.stat(filePath);
  const raw = await fs.readFile(filePath, 'utf8');

  // —— 1. 阶段表格 ——
  const stages = [];
  const lines = raw.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (!inTable) {
      if (/^\|\s*阶段\s*\|/.test(line)) inTable = true;
      continue;
    }
    if (/^\|[-:\s]+\|/.test(line)) continue; // 分隔行
    if (!line.trim().startsWith('|')) break; // 表格结束
    const m = line.match(STAGE_ROW);
    if (!m) continue;
    const [, idx, name, statusCell, target, date] = m;
    stages.push({
      index: parseInt(idx, 10),
      name: name.trim(),
      status: determineStatus(statusCell),
      statusText: statusCell.trim(),
      target: target.trim(),
      completedAt: date.trim() === '-' ? null : date.trim(),
    });
  }

  // —— 2. 当前断点段落 ——
  let currentIndex = null;
  let currentStageText = null;
  let breakpointHtml = null;
  const bpStart = raw.indexOf('## 当前断点');
  if (bpStart !== -1) {
    const after = raw.slice(bpStart);
    const nextH2 = after.slice(2).search(/\n## /); // 避开自己这行的 ##
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

  // 若表格标记为 pending 但其实是当前，修正为 in-progress
  if (currentIndex != null) {
    const cur = stages.find((s) => s.index === currentIndex);
    if (cur && cur.status === 'pending') cur.status = 'in-progress';
  }

  const totalStages = stages.length;
  const doneStages = stages.filter((s) => s.status === 'done').length;
  const progressPct = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

  // —— 3. 每日学习记录（扫 ### YYYY-MM-DD）——
  const activityDates = [];
  const seenDates = new Set();
  for (const m of raw.matchAll(/^###\s+(\d{4})-(\d{2})-(\d{2})/gm)) {
    const d = `${m[1]}-${m[2]}-${m[3]}`;
    if (!seenDates.has(d)) { seenDates.add(d); activityDates.push(d); }
  }
  activityDates.sort();
  const streak = computeStreak(activityDates);
  const recent30 = buildRecent30(activityDates);

  return {
    path: 'progress.md',
    mtime: stat.mtime.toISOString(),
    size: stat.size,
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

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 从今天（或最近一天有记录的日子）往前连续算
function computeStreak(dates) {
  if (dates.length === 0) return 0;
  const set = new Set(dates);
  const today = new Date();
  let cur = new Date(today);
  // 若今天没打卡，从昨天起算（容忍尚未开始）
  if (!set.has(toYMD(cur))) cur.setDate(cur.getDate() - 1);
  let days = 0;
  while (set.has(toYMD(cur))) {
    days++;
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

// 近 30 天热图：最旧 → 最新，每项 { date, active }
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
