import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { subscribeFileEvents } from '../src/lib/api.js';

test('SSE 致命错误也会重新连接，取消订阅后不再重连', async (t) => {
  const previous = globalThis.EventSource;
  const instances = [];
  globalThis.EventSource = class {
    constructor(url) { this.url = url; instances.push(this); }
    close() { this.closed = true; }
  };
  t.after(() => { globalThis.EventSource = previous; });
  const states = []; const messages = [];
  const stop = subscribeFileEvents((event) => messages.push(event), (connected) => states.push(connected));
  t.after(stop);
  instances[0].onopen();
  instances[0].onmessage({ data: '{"type":"change","path":"a.md"}' });
  instances[0].onerror();
  assert.equal(instances[0].closed, true);
  await delay(1100);
  assert.equal(instances.length, 2);
  instances[1].onopen();
  assert.deepEqual(states, [true, false, true]);
  assert.equal(messages[0].path, 'a.md');
  instances[1].onerror();
  stop();
  await delay(1100);
  assert.equal(instances.length, 2);
});
