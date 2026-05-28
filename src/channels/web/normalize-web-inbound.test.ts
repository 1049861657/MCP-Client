import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWebInbound } from './normalize-web-inbound.js';

test('normalizeWebInbound 无工具字段时不写入 chatOptions', () => {
  const envelope = normalizeWebInbound({
    body: { messages: [{ role: 'user', content: 'hi' }] },
    requestId: 'req-1'
  });
  assert.equal(envelope.payload.chatOptions, undefined);
});

test('normalizeWebInbound 仅透传 body 显式 enableTools', () => {
  const envelope = normalizeWebInbound({
    body: {
      messages: [{ role: 'user', content: 'hi' }],
      enableTools: false
    },
    requestId: 'req-2'
  });
  assert.equal(envelope.payload.chatOptions?.enableTools, false);
  assert.equal(envelope.payload.chatOptions?.enablePrompts, undefined);
});

test('normalizeWebInbound 透传 body mcpServerIds', () => {
  const envelope = normalizeWebInbound({
    body: {
      messages: [{ role: 'user', content: 'hi' }],
      mcpServerIds: ['srv-a', 'srv-b']
    },
    requestId: 'req-3'
  });
  assert.deepEqual(envelope.payload.chatOptions?.mcpServerIds, ['srv-a', 'srv-b']);
});
