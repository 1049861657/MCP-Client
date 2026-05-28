import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFeishuSessionKey } from './session-key.js';

test('buildFeishuSessionKey 使用 chat_id 分区', () => {
  assert.equal(buildFeishuSessionKey('oc_abc123'), 'feishu:oc_abc123');
});
