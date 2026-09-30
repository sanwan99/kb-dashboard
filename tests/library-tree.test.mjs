import test from 'node:test';
import assert from 'node:assert/strict';
import { browseRoot, directoryAncestors, readableEntries, visibleTreeRows } from '../src/lib/libraryTree.js';

const folder = (path) => ({ name: path.split('/').pop(), type: 'dir', path });
const file = (path) => ({ name: path.split('/').pop(), type: 'file', path, ext: path.split('.').pop() });
const root = [folder('project/db'), folder('project/md')];
const directories = {
  'project/db': { status: 'ready', entries: [file('project/db/upgrade.sql')] },
  'project/md': { status: 'ready', entries: [folder('project/md/需求'), file('project/md/README.md')] },
  'project/md/需求': { status: 'ready', entries: [file('project/md/需求/方案.md')] },
};

test('多个目录同时展开，子项留在对应父项下', () => {
  const rows = visibleTreeRows(root, new Set(['project/db', 'project/md', 'project/md/需求']), directories, 'project');
  assert.deepEqual(rows.map((row) => [row.entry.path, row.level]), [
    ['project/db', 1], ['project/db/upgrade.sql', 2], ['project/md', 1],
    ['project/md/需求', 2], ['project/md/需求/方案.md', 3], ['project/md/README.md', 2],
  ]);
});

test('折叠父目录隐藏所有后代，保留其他分支及后代展开偏好', () => {
  const rows = visibleTreeRows(root, new Set(['project/db', 'project/md/需求']), directories, 'project');
  assert.deepEqual(rows.map((row) => row.entry.path), ['project/db', 'project/db/upgrade.sql', 'project/md']);
});

test('展开目录按需显示加载、错误与空态；不可用目录不发起展开', () => {
  const expanded = new Set(['project/db', 'project/md']);
  assert.equal(visibleTreeRows(root, expanded, {}, 'project')[1].status, 'loading');
  const state = { 'project/db': { status: 'error', error: new Error('offline') }, 'project/md': { status: 'ready', entries: [] } };
  assert.deepEqual(visibleTreeRows(root, expanded, state, 'project').filter((row) => !row.entry).map((row) => row.status), ['error', 'empty']);
  assert.equal(visibleTreeRows([{ ...folder('unavailable'), available: false }], new Set(['unavailable']), {}).length, 1);
});

test('旧深层目录链接保留项目根，选中文件只展开当前项目祖先', () => {
  assert.equal(browseRoot({ scope: 'work:project', browseSource: 'work', folder: 'project/md/需求' }), 'project');
  assert.equal(browseRoot({ scope: 'all', browseSource: 'work', folder: 'project/md' }), 'project');
  assert.equal(browseRoot({ scope: 'custom:mount', browseSource: 'custom', folder: '' }), 'mount');
  assert.deepEqual(directoryAncestors('project/md/需求', 'project'), ['project/md', 'project/md/需求']);
  assert.deepEqual(directoryAncestors('project2/md', 'project'), []);
  assert.deepEqual(readableEntries([folder('a'), file('a.md'), file('a.sql'), file('image.png')]).map((entry) => entry.path), ['a', 'a.md', 'a.sql']);
});
