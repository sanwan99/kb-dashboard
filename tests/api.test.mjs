import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

async function waitUntil(fn, label, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { try { const value = await fn(); if (value) return value; } catch {} await delay(80); }
  throw new Error(`等待超时：${label}`);
}

test('真实 API：索引、分页、范围、预览、来源管理、文件更新与退役边界', { timeout: 30000 }, async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-library-api-'));
  const data = path.join(root, 'data');
  const custom = path.join(root, 'custom');
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  for (const name of ['work/IAM', 'work/Message', 'learn', 'obsidian', 'work/ai全局管理']) await fs.mkdir(path.join(data, name), { recursive: true });
  await fs.mkdir(custom);
  for (let i = 0; i < 45; i++) await fs.writeFile(path.join(data, 'work/IAM', `${i}.md`), `---\ntitle: Webhook 手册 ${i}\n---\n# Webhook 手册 ${i}\n## 使用方法\nWebhook payload ${i}\n`);
  await fs.writeFile(path.join(data, 'work/Message/a.md'), '# Webhook 消息');
  await fs.writeFile(path.join(data, 'work/IAM/query.sql'), 'SELECT id FROM documents;');
  await fs.writeFile(path.join(data, 'work/IAM/large.sql'), 'x'.repeat(2001));
  await fs.writeFile(path.join(data, 'learn/retired.md'), '# retiretoken');
  await fs.writeFile(path.join(data, 'obsidian/retired.md'), '# retiretoken');
  await fs.writeFile(path.join(data, 'work/ai全局管理/retired.md'), '# retiretoken');
  await fs.writeFile(path.join(custom, '手册.md'), '# localmounttoken\n自定义资料');
  const child = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, PORT: String(port), KB_DATA_DIR: data, KB_CONFIG_DIR: path.join(root, 'config'), KB_PREVIEW_MAX_FILE_BYTES: '2000' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout.on('data', (chunk) => { output = (output + chunk).slice(-10000); }); child.stderr.on('data', (chunk) => { output = (output + chunk).slice(-10000); });
  t.after(async () => { child.kill('SIGTERM'); await new Promise((resolve) => { if (child.exitCode !== null) resolve(); else child.once('exit', resolve); }); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${port}`;
  const get = async (route) => { const response = await fetch(base + route); return { status: response.status, data: await response.json() }; };
  const write = async (route, method, body) => { const response = await fetch(base + route, { method, ...(body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}) }); return { status: response.status, data: await response.json() }; };
  await waitUntil(async () => (await get('/api/health')).status === 200, `启动本地服务 ${output}`);
  await t.test('仅提供 work/custom，空查询不构建索引', async () => {
    assert.deepEqual((await get('/api/health')).data.sources, ['work', 'custom']);
    assert.equal((await get('/api/search?q=')).data.ready, false);
    assert.equal((await get('/api/file?source=learn&path=retired.md')).status, 410);
    assert.equal((await get('/api/obsidian/stats')).status, 410);
    const overview = (await get('/api/home/overview')).data;
    assert.equal(overview.learn.fileCount, 0);
    assert.equal(overview.learn.progress, null);
    assert.equal(overview.obsidian.fileCount, 0);
  });
  await t.test('分页不重复，筛选前计算项目结果总数，正文标题可检索', async () => {
    const first = (await get('/api/search?q=Webhook&source=work&project=IAM&limit=40')).data;
    assert.equal(first.total, 45); assert.equal(first.results.length, 40); assert.equal(first.hasMore, true);
    const second = (await get(`/api/search?q=Webhook&source=work&project=IAM&limit=40&offset=${first.nextOffset}`)).data;
    assert.equal(second.results.length, 5); assert.equal(second.hasMore, false);
    assert.equal(new Set([...first.results, ...second.results].map((item) => item.path)).size, 45);
    assert.ok(first.results.every((item) => item.title.startsWith('Webhook 手册')));
    assert.equal((await get('/api/search?q=retiretoken')).data.total, 0);
    const recent = (await get('/api/recent?source=work&project=Message')).data.items;
    assert.equal(recent.length, 1); assert.equal(recent[0].path, 'Message/a.md');
  });
  await t.test('Markdown/SQL 预览及失效、大文件、越界错误', async () => {
    assert.ok((await get('/api/file?source=work&path=IAM/0.md')).data.html.includes('<h2>使用方法</h2>'));
    assert.ok((await get('/api/file?source=work&path=IAM/query.sql')).data.html.includes('language-sql'));
    assert.equal((await get('/api/file?source=work&path=IAM/missing.md')).status, 404);
    assert.equal((await get('/api/tree?source=work&path=missing')).status, 404);
    assert.equal((await get('/api/file?source=work&path=IAM/large.sql')).status, 413);
    assert.equal((await get('/api/file?source=work&path=../outside.md')).status, 400);
  });
  await t.test('临时来源增改移除，不改原文件；挂载可立即检索', async () => {
    const added = await write('/api/custom-sources', 'POST', { path: custom, name: '测试目录' });
    assert.equal(added.status, 200); const id = added.data.id;
    assert.equal((await write('/api/custom-sources', 'POST', { path: custom })).status, 409);
    assert.equal((await get(`/api/search?q=localmounttoken&source=custom&mount=${id}`)).data.total, 1);
    assert.equal((await write(`/api/custom-sources/${id}`, 'PATCH', { name: '改名目录' })).data.name, '改名目录');
    assert.equal((await write(`/api/custom-sources/${id}`, 'DELETE')).status, 200);
    assert.equal((await get('/api/search?q=localmounttoken')).data.total, 0);
    assert.ok((await fs.readFile(path.join(custom, '手册.md'), 'utf8')).includes('localmounttoken'));
  });
  await t.test('文件变更自动使索引过期，刷新查询读到新内容', async () => {
    await fs.writeFile(path.join(data, 'work/IAM/0.md'), '# liveupdateuniquetoken\n更新后正文');
    await waitUntil(async () => (await get('/api/search/stats')).data.dirty, '监听到文件变化');
    assert.equal((await get('/api/search?q=liveupdateuniquetoken')).data.total, 1);
  });
});
