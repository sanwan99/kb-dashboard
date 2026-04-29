import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// 进度解析的"上次成功状态"缓存。
// 写入时机：结构化或正则解析成功后立即落盘
// 读取时机：当前请求的两路解析都失败时
// 路径：~/.kb-dashboard/learn-progress-cache.json（不污染笔记仓的只读约束）

const CACHE_DIR = path.join(os.homedir(), '.kb-dashboard');
const CACHE_FILE = path.join(CACHE_DIR, 'learn-progress-cache.json');

/** 读缓存；不存在或损坏返回 null。 */
export async function readCache() {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object' || !obj.cachedAt) return null;
    return obj;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return null; // 损坏也当不存在
  }
}

/**
 * 原子写缓存。payload 由调用方塑形（含 cachedAt / source / schemaVersion / progress）。
 * 失败不抛——缓存只是兜底，不能拖垮主流程。
 */
export async function writeCache(payload) {
  const body = {
    ...payload,
    cachedAt: new Date().toISOString(),
  };
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const tmp = CACHE_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(body, null, 2), 'utf8');
    await fs.rename(tmp, CACHE_FILE);
  } catch {
    // 静默：磁盘满 / 权限问题等都不要影响主流程
  }
}

export const CACHE_PATH = CACHE_FILE;
