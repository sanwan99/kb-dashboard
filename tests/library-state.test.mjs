import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLibraryState, scopeOptions, matchesScope, fileTitle, sourceLabel, parentPath } from '../src/lib/libraryState.js';
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
