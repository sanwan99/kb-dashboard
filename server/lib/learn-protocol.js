import yaml from 'js-yaml';

// 顶部 fenced kb-progress 块的协议解析与 schema 校验。
// 设计目标：AI 改 progress.md 正文不会污染机器消费的状态层；
// 任何 error 级问题让上游走 fallback，warn 级问题原样吐回响应让用户能定位。

const SUPPORTED_SCHEMA = 1;
const ID_RE = /^\d{1,3}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_ENUM = new Set(['done', 'in_progress', 'pending', 'optional']);

// 扫描前若干字节够覆盖文件头部协议块；过大易把正文里的 ```text 误认作 fence。
const SCAN_BYTES = 6000;

/**
 * 在 raw md 顶部找到 ```kb-progress ... ``` 围栏块，返回块体（不含围栏行）。
 * 找不到或未闭合返回 null。
 */
export function extractFencedBlock(rawMd) {
  const head = rawMd.slice(0, SCAN_BYTES);
  const lines = head.split('\n');
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^```kb-progress\s*$/.test(lines[i])) { start = i; break; }
  }
  if (start === -1) return null;
  for (let j = start + 1; j < lines.length; j++) {
    if (/^```\s*$/.test(lines[j])) {
      return lines.slice(start + 1, j).join('\n');
    }
  }
  return null; // 未闭合
}

// YAML 不加引号写 2026-04-14 会被解析成 Date；我们统一归一化成 'YYYY-MM-DD'。
function dateToString(v) {
  if (v == null) return null;
  if (v instanceof Date) {
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, '0');
    const d = String(v.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(v).trim();
}

function pushWarn(warnings, level, code, message, at) {
  warnings.push({ level, code, message, at });
}

/**
 * 对 yaml.load 后的对象做 schema 校验。
 * 返回 { valid, normalized, warnings }。
 *  - 有任何 error 级问题 → valid=false（上游应降级）
 *  - warn 级问题不影响 valid，但会出现在响应里
 */
export function validateProgress(obj) {
  const warnings = [];
  if (!obj || typeof obj !== 'object') {
    pushWarn(warnings, 'error', 'NOT_OBJECT', 'kb-progress 块解析后不是对象', '');
    return { valid: false, normalized: null, warnings };
  }

  // schemaVersion
  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    pushWarn(warnings, 'error', 'SCHEMA_VERSION_INVALID',
      `schemaVersion 必须是 ≥1 的整数，当前 ${JSON.stringify(schemaVersion)}`, 'schemaVersion');
    return { valid: false, normalized: null, warnings };
  }
  if (schemaVersion > SUPPORTED_SCHEMA) {
    pushWarn(warnings, 'warn', 'SCHEMA_VERSION_UNSUPPORTED',
      `当前 dashboard 仅支持 schema v${SUPPORTED_SCHEMA}，文件是 v${schemaVersion}，新字段可能被忽略`,
      'schemaVersion');
  }

  // currentStageId
  if (typeof obj.currentStageId !== 'string' || !ID_RE.test(obj.currentStageId)) {
    pushWarn(warnings, 'error', 'CURRENT_STAGE_ID_INVALID',
      `currentStageId 必须是 "01"–"999" 的字符串，当前 ${JSON.stringify(obj.currentStageId)}`,
      'currentStageId');
    return { valid: false, normalized: null, warnings };
  }

  // stages
  if (!Array.isArray(obj.stages) || obj.stages.length === 0) {
    pushWarn(warnings, 'error', 'STAGES_MISSING', 'stages 必须是非空数组', 'stages');
    return { valid: false, normalized: null, warnings };
  }
  const stages = [];
  const seenIds = new Set();
  for (let i = 0; i < obj.stages.length; i++) {
    const s = obj.stages[i];
    const at = `stages[${i}]`;
    if (!s || typeof s !== 'object') {
      pushWarn(warnings, 'error', 'STAGE_NOT_OBJECT', `${at} 不是对象`, at);
      return { valid: false, normalized: null, warnings };
    }
    if (typeof s.id !== 'string' || !ID_RE.test(s.id)) {
      pushWarn(warnings, 'error', 'STAGE_ID_INVALID',
        `${at}.id 必须是 "01"–"999" 字符串，当前 ${JSON.stringify(s.id)}`, `${at}.id`);
      return { valid: false, normalized: null, warnings };
    }
    if (seenIds.has(s.id)) {
      pushWarn(warnings, 'warn', 'STAGE_ID_DUPLICATE',
        `${at}.id "${s.id}" 重复`, `${at}.id`);
    }
    seenIds.add(s.id);

    let status = s.status;
    if (typeof status !== 'string' || !STATUS_ENUM.has(status)) {
      pushWarn(warnings, 'warn', 'ENUM_INVALID',
        `${at}.status=${JSON.stringify(status)} 不在 [done|in_progress|pending|optional]，已归为 pending`,
        `${at}.status`);
      status = 'pending';
    }

    const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim() : null;
    if (!title) {
      pushWarn(warnings, 'warn', 'STAGE_TITLE_MISSING', `${at}.title 为空`, `${at}.title`);
    }

    const completedAt = dateToString(s.completedAt);
    if (status === 'done' && !completedAt) {
      pushWarn(warnings, 'warn', 'COMPLETED_AT_MISSING',
        `${at} status=done 但缺 completedAt`, `${at}.completedAt`);
    }
    if (completedAt && !DATE_RE.test(completedAt)) {
      pushWarn(warnings, 'warn', 'DATE_FORMAT',
        `${at}.completedAt=${JSON.stringify(completedAt)} 不是 YYYY-MM-DD`, `${at}.completedAt`);
    }

    stages.push({
      id: s.id,
      title: title || `阶段 ${s.id}`,
      status,
      target: typeof s.target === 'string' ? s.target : '',
      completedAt: completedAt || null,
    });
  }

  if (!seenIds.has(obj.currentStageId)) {
    pushWarn(warnings, 'warn', 'CURRENT_STAGE_NOT_FOUND',
      `currentStageId "${obj.currentStageId}" 在 stages 中找不到`, 'currentStageId');
  }

  // current
  const curRaw = obj.current && typeof obj.current === 'object' ? obj.current : {};
  const current = {
    summary: typeof curRaw.summary === 'string' ? curRaw.summary : '',
    next: Array.isArray(curRaw.next) ? curRaw.next.filter((x) => typeof x === 'string') : [],
    updatedAt: dateToString(curRaw.updatedAt),
  };

  // activity（结构化路径下，60 天剪裁放到上游 learn.js，便于和正则路径对齐）
  const activity = [];
  if (Array.isArray(obj.activity)) {
    for (let i = 0; i < obj.activity.length; i++) {
      const a = obj.activity[i];
      const at = `activity[${i}]`;
      if (!a || typeof a !== 'object') {
        pushWarn(warnings, 'warn', 'ACTIVITY_NOT_OBJECT', `${at} 不是对象，已跳过`, at);
        continue;
      }
      const date = dateToString(a.date);
      if (!date || !DATE_RE.test(date)) {
        pushWarn(warnings, 'warn', 'ACTIVITY_DATE_INVALID',
          `${at}.date=${JSON.stringify(date)} 不是 YYYY-MM-DD，已跳过`, `${at}.date`);
        continue;
      }
      activity.push({
        date,
        stageId: typeof a.stageId === 'string' ? a.stageId : null,
        summary: typeof a.summary === 'string' ? a.summary : '',
      });
    }
  }

  return {
    valid: true,
    normalized: {
      schemaVersion,
      currentStageId: obj.currentStageId,
      currentSubstageId: typeof obj.currentSubstageId === 'string' ? obj.currentSubstageId : null,
      stages,
      current,
      activity,
    },
    warnings,
  };
}

/**
 * 入口：从 raw md 提取并解析 kb-progress 块。
 * @returns null  → 顶部根本没有 kb-progress 围栏块（让上游走 markdown_fallback）
 * @returns { progress, warnings }
 *           progress=null 表示有块但 schema 校验未通过（也走 fallback，但 warnings 要透出）
 *           progress=对象 表示结构化解析成功
 */
export function parseStructured(rawMd) {
  const block = extractFencedBlock(rawMd);
  if (block == null) return null;

  let parsed;
  try {
    parsed = yaml.load(block, { schema: yaml.DEFAULT_SCHEMA });
  } catch (err) {
    return {
      progress: null,
      warnings: [{
        level: 'error',
        code: 'YAML_PARSE_ERROR',
        message: `YAML 解析失败：${err.message}`,
        at: err.mark ? `line ${err.mark.line + 1}` : '',
      }],
    };
  }

  const { valid, normalized, warnings } = validateProgress(parsed);
  return {
    progress: valid ? normalized : null,
    warnings,
  };
}
