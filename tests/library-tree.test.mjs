import test from 'node:test';
import assert from 'node:assert/strict';
import { browseRoot, directoryAncestors, fileTreeLocation, readableEntries, treeRevealStatus, visibleTreeRows } from '../src/lib/libraryTree.js';

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

test('定位文件切到对应项目或挂载点，保留当前文件并清除检索和弹窗', () => {
  const location = fileTreeLocation({ source: 'work', path: 'project/md/需求/方案.md' });
  assert.deepEqual(location, { view: 'browse', browse: 'work', scope: 'work:project', folder: 'project/md/需求', source: 'work', path: 'project/md/需求/方案.md', q: null, panel: null, retired: null });
  assert.equal(browseRoot({ ...location, browseSource: location.browse }), 'project');
  const custom = fileTreeLocation({ source: 'custom', path: 'mount/目录/笔记.md' });
  assert.equal(custom.scope, 'custom:mount');
  assert.equal(custom.browse, 'custom');
  assert.equal(custom.folder, 'mount/目录');
  const top = fileTreeLocation({ source: 'work', path: 'README.md' });
  assert.equal(top.scope, 'work');
  assert.equal(top.folder, '');
  assert.equal(fileTreeLocation({ source: 'learn', path: 'file.md' }), null);
  assert.equal(fileTreeLocation(null), null);
});

test('定位等待祖先目录逐级加载，区分找到、缺失、不可用与读取失败', () => {
  const path = 'project/md/需求/方案.md';
  assert.equal(treeRevealStatus(path, 'project', root, {}), 'pending');
  assert.equal(treeRevealStatus(path, 'project', root, { 'project/md': directories['project/md'] }), 'pending');
  assert.equal(treeRevealStatus(path, 'project', root, directories), 'ready');
  assert.equal(treeRevealStatus('project/md/需求/缺失.md', 'project', root, directories), 'missing');
  assert.equal(treeRevealStatus(path, 'other', root, directories), 'missing');
  assert.equal(treeRevealStatus(path, 'project', root, { 'project/md': { status: 'error' } }), 'error');
  assert.equal(treeRevealStatus(path, 'project', [{ ...folder('project/md'), available: false }], {}), 'missing');
  assert.equal(treeRevealStatus('README.md', '', [file('README.md')], {}), 'ready');
  assert.equal(treeRevealStatus('mount/笔记.md', 'mount', [file('mount/笔记.md')], {}), 'ready');
});
