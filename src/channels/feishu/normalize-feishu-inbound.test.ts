import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FeishuInboundSkipError,
  normalizeFeishuInbound
} from './normalize-feishu-inbound.js';
import type { FeishuReceiveMessageEvent } from './feishu-event.types.js';

const baseEvent: FeishuReceiveMessageEvent = {
  event_id: 'evt_group_at_001',
  sender: {
    sender_type: 'user'
  },
  message: {
    message_id: 'om_msg_001',
    chat_id: 'oc_chat_001',
    chat_type: 'group',
    message_type: 'text',
    content: JSON.stringify({ text: '@_user_1 你好' }),
    mentions: [
      {
        key: '@_user_1',
        id: { open_id: 'ou_bot' },
        mentioned_type: 'bot',
        name: 'Bot'
      }
    ]
  }
};

test('群聊 @ 机器人文本 → user 消息', () => {
  const envelope = normalizeFeishuInbound(baseEvent);
  assert.equal(envelope.channel, 'feishu');
  assert.equal(envelope.sessionKey, 'feishu:oc_chat_001');
  assert.equal(envelope.channelMeta.messageId, 'om_msg_001');
  assert.equal(envelope.channelMeta.chatId, 'oc_chat_001');
  assert.equal(envelope.trace.idempotencyKey, 'evt_group_at_001');
  assert.equal(envelope.payload.messages[0]?.role, 'user');
  assert.equal(envelope.payload.messages[0]?.content, '你好');
});

test('sender_type=bot 时跳过', () => {
  assert.throws(
    () =>
      normalizeFeishuInbound({
        ...baseEvent,
        sender: { sender_type: 'bot' }
      }),
    FeishuInboundSkipError
  );
});

test('群聊未 @ 机器人时跳过', () => {
  assert.throws(
    () =>
      normalizeFeishuInbound({
        ...baseEvent,
        message: {
          ...baseEvent.message,
          content: JSON.stringify({ text: '普通群消息' }),
          mentions: undefined
        }
      }),
    (error: unknown) =>
      error instanceof FeishuInboundSkipError && error.message === '群聊未 @ 机器人'
  );
});

test('单聊无需 @ 也可入站', () => {
  const envelope = normalizeFeishuInbound({
    ...baseEvent,
    event_id: 'evt_p2p_001',
    message: {
      ...baseEvent.message,
      chat_type: 'p2p',
      content: JSON.stringify({ text: '私聊你好' }),
      mentions: undefined
    }
  });
  assert.equal(envelope.payload.messages[0]?.content, '私聊你好');
});
