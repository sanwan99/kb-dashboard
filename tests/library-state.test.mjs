import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLibraryState, scopeOptions, matchesScope, shouldRefreshUpdatedList, fileTitle, sourceLabel, parentPath } from '../src/lib/libraryState.js';
import { documentContent, previewSnippet } from '../server/lib/search-content.js';

test('链接保留查询、项目范围和中文路径；旧来源不能进入预览', () => {
  const params = new URLSearchParams({ q: 'Webhook 重试', scope: 'work:IAM', source: 'work', path: 'IAM/手册.md' });
  assert.deepEqual(parseLibraryState(params), { q: 'Webhook 重试', scope: 'work:IAM', source: 'work', path: 'IAM/手册.md', view: 'search', browseSource: 'work', folder: '', panel: null });
  assert.equal(parseLibraryState('?source=obsidian&path=旧文档.md').source, null);
  assert.equal(parseLibraryState('?view=wrong&scope=work:a/b').scope, 'all');
});

test('范围筛选尊重暂停来源，支持带冒号的项目名', () => {
  assert.deepEqual(scopeOptions('all', ['work']), { sources: ['work'] });
  assert.deepEqual(scopeOptions('custom:abc', ['work']), { sources: [], mount: 'abc' });
  assert.deepEqual(scopeOptions('work:api:v2'), { sources: ['work'], project: 'api:v2' });
  assert.equal(matchesScope({ source: 'work', path: 'api:v2/README.md' }, 'work:api:v2'), true);
  assert.equal(matchesScope({ source: 'work', path: 'IAM2/a.md' }, 'work:IAM'), false);
  assert.equal(parentPath('IAM/a/b.md'), 'IAM/a');
});

test('最近更新链接独立于关键词，保留来源范围与选中文档', () => {
  const state = parseLibraryState(new URLSearchParams({ view: 'updated', q: '旧查询', scope: 'custom:manual', source: 'custom', path: 'manual/手册.md' }));
  assert.equal(state.view, 'updated');
  assert.equal(state.q, '');
  assert.equal(state.scope, 'custom:manual');
  assert.equal(state.source, 'custom');
  assert.equal(state.path, 'manual/手册.md');
  assert.equal(parseLibraryState('?view=recent').view, 'recent');
});

test('最近更新只刷新当前启用来源与范围，新增、修改、删除和重建均生效', () => {
  const state = { view: 'updated', scope: 'work:IAM' };
  for (const type of ['add', 'change', 'unlink']) assert.equal(shouldRefreshUpdatedList({ type, source: 'work', path: 'IAM/手册.md' }, state), true);
  assert.equal(shouldRefreshUpdatedList({ type: 'unlink', kind: 'dir', source: 'work', path: 'IAM' }, state), true);
  assert.equal(shouldRefreshUpdatedList({ type: 'change', source: 'work', path: 'Message/a.md' }, state), false);
  assert.equal(shouldRefreshUpdatedList({ type: 'change', source: 'work', path: 'IAM/a.md' }, state, ['custom']), false);
  assert.equal(shouldRefreshUpdatedList({ type: 'change', source: 'learn', path: 'IAM/a.md' }, state), false);
  assert.equal(shouldRefreshUpdatedList({ type: 'reindex' }, state), true);
  assert.equal(shouldRefreshUpdatedList({ type: 'reindex' }, { view: 'recent', scope: 'all' }), false);
  assert.equal(shouldRefreshUpdatedList({ type: 'change', source: 'custom', path: 'manual/a.md' }, { view: 'updated', scope: 'custom:manual' }), true);
  assert.equal(shouldRefreshUpdatedList({ type: 'change', source: 'custom', path: 'other/a.md' }, { view: 'updated', scope: 'custom:manual' }), false);
});

test('索引与预览标题优先正文名称，不把 frontmatter 和代码块当标题', () => {
  const raw = '---\ntitle: 接口手册\nsecretMetadata: hidden\n---\n# Webhook\n正文';
  const value = documentContent(raw, 'md', 'README');
  assert.equal(value.title, '接口手册');
  assert.ok(!value.content.includes('secretMetadata'));
  assert.equal(fileTitle({ meta: { title: value.title }, raw: value.content, ext: 'md' }), '接口手册');
  assert.equal(documentContent('```sh\n# 非标题\n```\n# 正文标题', 'md', 'file').title, '正文标题');
  assert.equal(fileTitle({ path: 'IAM/query.sql' }), 'query.sql');
  assert.equal(sourceLabel({ source: 'custom', path: 'abc/a.md' }, [{ id: 'abc', name: '手册' }]), '手册');
});

test('摘要去掉 Markdown 外壳并转义 HTML，仅对命中词添加标记', () => {
  const result = previewSnippet('# Webhook\n[文档](http://example.test) & "参数"\n<script>alert(1)</script>\n`Webhook`', 'Webhook');
  assert.ok(!result.preview.includes('http://'));
  assert.ok(!result.snippet.includes('<script>'));
  assert.ok(result.snippet.includes('&amp;'));
  assert.equal((result.snippet.match(/<mark>/g) || []).length, 2);
});
