import test from 'node:test';
import assert from 'node:assert/strict';
import { createMermaidRenderer } from '../src/lib/mermaidRenderer.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function documentFixture() {
  const children = new Set();
  const document = {
    body: { appendChild: (node) => children.add(node) },
    createElement: () => ({ style: {}, remove() { children.delete(this); } }),
  };
  return { document, children };
}

test('并发请求串行初始化与渲染，图 ID 不重复，仅清理自己的临时容器', async () => {
  const fixture = documentFixture();
  const foreignHost = {}; fixture.children.add(foreignHost);
  const started = deferred();
  const finish = deferred();
  const events = [];
  const ids = [];
  const renderer = createMermaidRenderer(async () => ({
    initialize: (config) => events.push(config.theme),
    render: async (id, source) => { ids.push(id); events.push(source); if (source === 'first') { started.resolve(); await finish.promise; } return { svg: source }; },
  }));
  const first = renderer('first', { theme: 'light' }, { document: fixture.document });
  const second = renderer('second', { theme: 'dark' }, { document: fixture.document });
  await started.promise;
  assert.deepEqual(events, ['light', 'first']);
  finish.resolve();
  assert.deepEqual(await Promise.all([first, second]), [{ svg: 'first' }, { svg: 'second' }]);
  assert.deepEqual(events, ['light', 'first', 'dark', 'second']);
  assert.equal(new Set(ids).size, 2);
  assert.deepEqual([...fixture.children], [foreignHost]);
});

test('切换文档后丢弃旧结果，队列中的过期任务不再渲染', async () => {
  const fixture = documentFixture();
  const started = deferred(); const finish = deferred();
  let active = true; let queuedActive = true;
  const rendered = [];
  const renderer = createMermaidRenderer(async () => ({ initialize() {}, render: async (_, source) => { rendered.push(source); started.resolve(); await finish.promise; return { svg: source }; } }));
  const running = renderer('old', {}, { document: fixture.document, isCurrent: () => active });
  const queued = renderer('queued-old', {}, { document: fixture.document, isCurrent: () => queuedActive });
  await started.promise;
  active = false; queuedActive = false; finish.resolve();
  assert.equal(await running, null);
  assert.equal(await queued, null);
  assert.deepEqual(rendered, ['old']);
  assert.equal(fixture.children.size, 0);
});

test('单张图失败不会阻断后续图，失败容器也被清理', async () => {
  const fixture = documentFixture();
  const renderer = createMermaidRenderer(async () => ({ initialize() {}, render: async (_, source) => { if (source === 'bad') throw new Error('syntax'); return { svg: source }; } }));
  const bad = renderer('bad', {}, { document: fixture.document });
  const good = renderer('good', {}, { document: fixture.document });
  await assert.rejects(bad, /syntax/);
  assert.deepEqual(await good, { svg: 'good' });
  assert.equal(fixture.children.size, 0);
});

test('加载字体时取消任务，不初始化图形或创建容器', async () => {
  const fixture = documentFixture(); const fonts = deferred(); const loaded = deferred();
  fixture.document.fonts = { ready: fonts.promise };
  let active = true; let initialized = false;
  const renderer = createMermaidRenderer(async () => { loaded.resolve(); return { initialize: () => { initialized = true; }, render() { throw new Error('unexpected'); } }; });
  const result = renderer('old', {}, { document: fixture.document, isCurrent: () => active });
  await loaded.promise;
  active = false; fonts.resolve();
  assert.equal(await result, null);
  assert.equal(initialized, false);
  assert.equal(fixture.children.size, 0);
});
