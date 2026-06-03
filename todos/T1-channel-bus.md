# T1 — 渠道层 + 消息总线层

> **状态**：**已验收**（2026-06-03）；**T1-08 钉钉 E2E 已通过**（2026-05-27）；**T1-07-07 飞书 E2E 搁置收口**（无测试租户，代码已交付，不阻塞交付）  
> **范围**：渠道接入 + 异步总线（**Web + 飞书 + 钉钉**）  
> **前置**：P0 完成（`agent-harness`、`InternalMessage`、SSE 已可用）；可与 P1 并行  
> **预估**：**34** 子项（34/34 已勾；T1-07-07 为搁置收口）  
> **参考**：[REFERENCES.md — 渠道层·消息总线](./REFERENCES.md#渠道层--消息总线)

---

## 现状 → 目标

**现网（改造前）**

```
POST /api/chat/stream
  → ai.controller.chatStream：写 SSE 头 + event:begin
  → AiProvider.chatStream → runAgentLoop
  → onChunk 回调里 res.write（data / context_compacted）
  → usage / done / error
```

- 请求体：`messages[]`（或单条 `message`）、`vendor`、`model`、`enableTools` 等；**不含** `sessionId`（会话 ID 仅前端 IndexedDB，`ai-core.js` 的 `state.sessionId`）
- 类型：`InternalMessage`、`ChunkResponse` → `src/core/agent-harness/types.ts`
- 规范化：`normalizeMessages()` → `message-normalizer.ts`

**目标（改造后）**

```
POST /api/chat/stream
  → 验参 → normalize → Envelope → publishInbound（BullMQ）
  → 立即 event:begin（SSE 头已写）
  → Inbound Worker → envelopeToInternalMessages → AiProvider.chatStream
  → onChunk → OutboundRouter → WebOutboundSink(requestId) → res.write（格式不变）
```

Harness **不改** Loop 语义；动的是 **Controller 入站** 与 **chunk 出站路径**。

---

## 约束

| 项 | 决策 |
|----|------|
| 包管理 | **pnpm**（`pnpm add bullmq ioredis`） |
| sessionKey | **`web:{requestId}`**（T1 请求体无 sessionId）；`buildWebSessionKey(requestId)` |
| 同会话有序 | T1 一次请求一条 job，`requestId` 即分区键；body 将来可选 `sessionId` 时再改为 `web:{sessionId}` |
| SSE ↔ Worker | **`OutboundSinkRegistry`**；见下文「Sink 生命周期」 |
| Adapter / Worker 启动 | **`src/channels/bootstrap.ts`**：`registerWebAdapter` + **`startInboundWorker()`**（`app.ts` 调用） |
| Redis 配置 | **`REDIS_URL`**；**key 前缀 `mcp-client`**（见下）；队列名 `queue-names.ts`；**`INBOUND_WORKER_CONCURRENCY`** 默认 `5` |
| Outbound Queue | T1 **不建**独立出站队列；Router 直调 Adapter |
| idempotencyKey | 默认 **`requestId`**；`jobId` = key；Redis SET NX **TTL 24h** |
| 非流式 `/api/chat` | **已废弃（方案 A）**：保留路由与 `chat()` 直调 Harness，**不接入 Bus**；UI 隐藏标准模式，仅调试区可选 |
| SSE keep-alive | `publishInbound` 成功后每 **15s** 写 `: keep-alive\n\n`；`done`/`error`/`close` 时清除定时器 |

### Redis key 前缀（公司共享实例，定稿 `mcp-client`）

| 用途 | key 形态 | 配置位置 |
|------|----------|----------|
| BullMQ 队列 | `{prefix}:...`（BullMQ 内部结构） | Queue/Worker **`prefix: 'mcp-client'`**（勿用 ioredis `keyPrefix`） |
| 幂等去重 | `mcp-client:idem:{idempotencyKey}` | `idempotency.ts`，TTL 24h |
| 常量 | `REDIS_KEY_PREFIX = 'mcp-client'` | `src/message-bus/queue-names.ts` |

GUI 里应看到新 key 以 **`mcp-client`** 开头，与 `flp-*`、`X-Token` 等并列，互不冲突。

---

```
register(requestId, res, abortController)
  → publishInbound（失败则 error 帧 + unregister + end，见下）
  → Worker 消费
  → finally unregister（幂等）
```

| 场景 | 行为 |
|------|------|
| Worker 启动时 **无 sink** | **不调 Harness**；`job` 正常结束（客户端已离开或重复 unregister） |
| `res.on('close')` | 仅 **`abortController.abort()`**；**不在 close 时 unregister**（避免 Worker 尚未消费 sink 已删） |
| Worker `finally` | **`unregister(requestId)`**（幂等，覆盖正常/异常路径） |
| `publishInbound` 抛错 | 立即 `event:error` + `unregister` + `res.end()`（SSE 头已写，禁止悬空） |
| Worker 进程 crash | 依赖 **`res.close`** 触发 abort；连接断开后由 OS 回收；T1 不做分布式 lease |

> Worker 取 sink 后若 **`abortSignal.aborted`**，不调 Harness，直接结束 job。

---

## 技术选型

| 模块 | 采用 | 不采用 |
|------|------|--------|
| 消息总线 | `bullmq` + `ioredis` + Redis **6.2+**（公司实例 6.2.6） | 内存队列、Kafka/NATS |
| Envelope | `zod` + CloudEvents 核心字段 | `@cloudevents/sdk` |
| Web | 自研 Adapter | 第三方 Gateway 嵌入 |
| Session 持久化 | Web 用 body **`messages[]`**；飞书用 **`feishu:{chatId}`** + 当轮消息 | 跨端统一会话见 P3-04 |

**BullMQ**：`maxRetriesPerRequest: null`；`attempts` + 指数退避；`removeOnComplete` / `removeOnFail`。

**Gateway 参考**（不依赖）：OpenClaw Channel Plugin、MessagingGateway Ports。

---

## Envelope 形状（实现依据）

**入站 `AgentMessageEnvelope`（Web）**

```typescript
{
  id: string;              // UUID v7，与 requestId 可相同
  source: 'web:api';
  type: 'agent.message.inbound';
  time: string;            // ISO8601
  channel: 'web';
  sessionKey: string;      // web:{requestId}
  channelMeta: {
    requestId: string;
    vendor?: string;
    abortSignal?: AbortSignal;  // 仅进程内传递，不入队 JSON
  };
  payload: {
    messages: InternalMessage[];  // 与现网 body.messages 一致
    chatOptions: {               // zod 全部 .optional()；Worker 用 pickDefined 透传，禁止 spread 带 undefined
      model?, temperature?, maxTokens?, enableTools?, enableParamValidation?,
      enablePrompts?, maxToolCallRounds?, enableAutoCompact?, compactModel?
    };
  };
  trace: { traceId: string; idempotencyKey: string; };
}
```

> 入队 JSON **不含** abortSignal。Sink 在 Controller **`register` 之后、`publishInbound` 之前** 建立；Worker 只从 Registry 取 **`AbortSignal`**（见「Sink 生命周期」）。

**`chatOptions` 透传**：`src/channels/envelope-mapper.ts` 提供 `pickDefined(chatOptions)`，仅传非 `undefined` 字段给 `AiProvider`。

**出站 `AgentOutboundEnvelope`（Web → SSE）**

```typescript
{
  sessionKey: string;
  channel: 'web';
  requestId: string;
  kind: 'chunk' | 'context_compacted' | 'usage' | 'done' | 'error';
  payload: ChunkResponse | { summaryContent? } | usage对象 | { finish_reason? } | { error: string };
}
```

SSE 映射（与 `ai.controller.ts` 现网一致）：

| kind | SSE |
|------|-----|
| chunk | `data: ${JSON.stringify({ ...chunk, requestId })}\n\n` |
| context_compacted | `event: context_compacted\ndata: ...` |
| usage | `event: usage\ndata: ...` |
| done | `event: done\ndata: ...` |
| error | `event: error\ndata: ...` |

---

## 范围与设计原则

| 做 | 不做 |
|----|------|
| Web / 飞书 / 钉钉 Adapter、Envelope、Inbound Queue + Worker、OutboundRouter + SinkRegistry | 独立 Outbound Queue |
| 幂等 + traceId | 改 `frontend/src/chat/api.js` |

1. Harness 只接 `InternalMessage[]`，出 `ChunkResponse`  
2. Web 行为与改造前一致  
3. 接口按多渠道设计；T1-03～06 交付 **web**，T1-07 **feishu**，T1-08 **dingtalk**

---

## 目标架构

```
Web UI → WebChannelAdapter(inbound) → Envelope → BullMQ Inbound
                        ↑                              ↓
              OutboundSinkRegistry ← OutboundRouter ← Worker → AiProvider → Harness
                        ↓
                   SSE res.write
```

---

## 开发顺序

`T1-01 → T1-02 → T1-03 → T1-04 → T1-05 → T1-06 → T1-07 → T1-08`（T1-04 前须完成 01–03；01 与 02 可并行；T1-08 可复用 T1-07 模式）

---

## 必读代码（动手前）

| 文件 | 看什么 |
|------|--------|
| `src/api/ai.controller.ts` | `chatStream` 请求体、SSE 帧、`abortController`、`requestId` |
| `src/providers/ai-provider.ts` | `chatStream(...)` 签名与 `onChunk` 回调 |
| `src/core/agent-harness/types.ts` | `InternalMessage`、`ChunkResponse` |
| `src/core/agent-harness/message-normalizer.ts` | Worker 输出前仍走 normalize |
| `frontend/src/chat/api.js` | 消费 `begin` / `data` / `usage` / `done` |

---

## T1-01 契约与目录

- [x] **T1-01-01** `src/types/channel.types.ts` + `channel.schema.ts` — 入站/出站类型与 zod（见 Envelope）；**`payload.messages` 必填**，`chatOptions` 字段均 `.optional()`  
  - 验收：parse 失败 throw；无 `any`  
  - 完成日期：2026-05-27

- [x] **T1-01-02** `src/channels/session-key.ts` — `buildWebSessionKey(requestId: string): string` → `web:${requestId}`  
  - 验收：`web:${requestId}` 格式正确（代码审查）  
  - 完成日期：2026-05-27

- [x] **T1-01-03** `src/channels/types.ts` — `ChannelAdapter`、`InboundPort`  
  - `ChannelAdapter`：`readonly channel`、`sendOutbound(envelope)`、`registerSink`/`unregisterSink`（Web 专用可放 web 子模块）  
  - 完成日期：2026-05-27

- [x] **T1-01-04** `src/message-bus/types.ts` — `MessageBus.publishInbound`；`OutboundRouter.route`  
  - `outbound-sink-registry.ts` — `register` / `get` / `unregister`（**unregister 幂等**）  
  - 完成日期：2026-05-27

---

## T1-02 消息总线（Inbound）

- [x] **T1-02-01** `redis-connection.ts`；`queue-names.ts`（**`REDIS_KEY_PREFIX='mcp-client'`**、inbound 队列名）；`.env.example`：`REDIS_URL`、`INBOUND_WORKER_CONCURRENCY`  
  - BullMQ **`prefix: REDIS_KEY_PREFIX`**；**禁止** ioredis `keyPrefix`  
  - 验收：无 `REDIS_URL` 启动 throw；Redis 里新 key 以 `mcp-client` 开头  
  - 完成日期：2026-05-27

- [x] **T1-02-02** `inbound-queue.ts` — `publishInbound`、`startInboundWorker`；Worker **`concurrency`** 读 env/常量；`jobId = idempotencyKey`  
  - 验收：**集成测试** `publishInbound` → handler 收到同一 envelope（作为 PR-1 基线）  
  - 完成日期：2026-05-27

- [x] **T1-02-03** `idempotency.ts` — **`mcp-client:idem:{idempotencyKey}`**，`SET NX EX 86400`  
  - 验收：重复 jobId 跳过；key 自动过期；GUI 可见 `mcp-client:idem:*`  
  - 完成日期：2026-05-27

- [x] **T1-02-04** enqueue/dequeue 日志：`traceId`、`sessionKey`、`channel`、`requestId`  
  - 完成日期：2026-05-27

- [x] **T1-02-05** `bootstrap.ts`（或 `message-bus/index.ts`）导出 **`startMessageBus()`**：`startInboundWorker(inbound-worker)`；**`app.ts` 启动时调用**（与 T1-03-03 同 PR 亦可）  
  - 验收：进程启动后 Worker 已订阅队列  
  - 完成日期：2026-05-27

---

## T1-03 Web 渠道 Adapter

- [x] **T1-03-01** `src/channels/web/normalize-web-inbound.ts` — `req.body` + `requestId` + `AbortSignal` → Envelope  
  - 验收：`messages[]` 与 chatOptions 字段正确映射（代码审查 / 现网行为）  
  - 完成日期：2026-05-27

- [x] **T1-03-02** `src/channels/web/web-channel.adapter.ts` — `sendOutbound` 按 kind 写 SSE（复用现网 write 逻辑，可从 controller 抽取）  
  - 验收：与现网帧格式 byte-level 一致（可快照测试）  
  - 完成日期：2026-05-27

- [x] **T1-03-03** `bootstrap.ts` + `registry.ts` — 注册 web Adapter；**不含** Worker 启动（见 T1-02-05）  
  - 验收：`app.ts` 调用 channel bootstrap  
  - 完成日期：2026-05-27

- [x] **T1-03-04** `ai.controller.ts` — `chatStream`：SSE 头 + `begin` → `register` → `publishInbound`（**try/catch**：失败 → `event:error` + unregister + end）  
  - 成功后启动 **15s SSE comment keep-alive** 定时器，`done`/`error`/`close` 清除  
  - `res.on('close')`：**仅 abort**，不 unregister  
  - 验收：Redis 不可用时客户端收到 error 而非挂起；长推理期间连接不被 nginx  idle 断开  
  - 完成日期：2026-05-27

---

## T1-04 Agent 集成（Inbound Worker）

- [x] **T1-04-01** `inbound-worker.ts` — `getSink(requestId)` 为 null **或** `abortSignal.aborted` → 跳过 Harness；否则 `pickDefined(chatOptions)` + `chatStream`  
  - 验收：客户端抢先断开时不崩溃；abort 仍中止 Loop  
  - 完成日期：2026-05-27

- [x] **T1-04-02** `envelope-mapper.ts` — messages + **`pickDefined(chatOptions)`**  
  - 验收：与改前 API 行为一致；无多余 `undefined` 入参  
  - 完成日期：2026-05-27

- [x] **T1-04-03** onChunk → Router；usage/done/error；**finally unregister**（幂等）  
  - 验收：流式 chunk 不丢  
  - 完成日期：2026-05-27

---

## T1-05 Outbound Router

- [x] **T1-05-01** `src/message-bus/outbound-router.ts` — `channel === 'web'` → `WebChannelAdapter.sendOutbound`  
  - 验收：Harness/Worker 无 `res.write`  
  - 完成日期：2026-05-27（随 T1-04-03 一并实现）

- [x] **T1-05-02** **`POST /api/chat` 标记废弃**：保留直调 Harness，不接入 Bus；`ai.controller.ts` 注释 + UI 隐藏标准模式（调试区可选）  
  - 验收：非流式路径行为与改造前一致；生产 UI 仅推荐流式  
  - 完成日期：2026-05-27

---

## T1-06 验收

- [x] **T1-06-01** E2E：多轮 tool + SSE + abort + 与改造前行为一致  
  - 验收：与改造前一致；abort 不崩溃

- [x] **T1-06-02** 更新 [ROADMAP.md](./ROADMAP.md) 架构图（API ↔ Bus ↔ Harness）  
  - 完成日期：2026-05-27

---

## 完成检查

- [x] `chatStream` 全链路：Envelope → BullMQ → Worker → Router → Sink → SSE
- [x] Harness / `agent-loop` 无 `channel` 分支
- [x] 未引入第三方 Gateway 依赖

---

## T1-07 飞书渠道

- [x] **T1-07-01** `channel.types` / `channel.schema` — `ChannelId` 增 **`feishu`**；`FeishuChannelMeta`（含 **`messageId`、`chatId`**）、入站 zod  
  - 验收：parse 失败 throw；`payload.messages` + `chatOptions?` 与 Web 同构
  - 完成日期：2026-05-27

- [x] **T1-07-02** `session-key.ts` — `buildFeishuSessionKey(chatId: string): string` → **`feishu:{chatId}`**（事件 `message.chat_id`）  
  - 验收：`feishu:{chatId}` 格式正确（代码审查）  
  - 完成日期：2026-05-27

- [x] **T1-07-03** `channels/feishu/normalize-feishu-inbound.ts` — **`im.message.receive_v1`** → `AgentMessageEnvelope`；**`idempotencyKey` = header `event_id`**  
  - 验收：群聊 `@机器人` 文本 → `role: user`；跳过 `sender_type=bot`；群聊未 @ 时跳过（E2E / 代码审查）  
  - 完成日期：2026-05-27

- [x] **T1-07-04** `channels/feishu/feishu-channel.adapter.ts` — `sendOutbound`：chunk 聚合后 **`im.v1.message.reply`**（`messageId` 来自 meta）；MVP **`msg_type=text`**；不经 OutboundSinkRegistry  
  - 验收：无 `res.write`；回复挂在用户消息下
  - 完成日期：2026-05-27

- [x] **T1-07-05** `channels/feishu/feishu-event-listener.ts` — **`WSClient` + `EventDispatcher`**（`@larksuiteoapi/node-sdk` ≥ 1.24.0）；企业自建应用 + 后台 **`im.message.receive_v1` / 长连接** 已保存  
  - handler **仅** normalize + **`publishInbound`**，**禁止 await Harness**，3s 内返回；`bootstrap.ts` + `app.ts` 启动  
  - `.env.example`：`FEISHU_APP_ID`、`FEISHU_APP_SECRET`  
  - 验收：长连接在线；日志 `inbound enqueue channel=feishu`
  - 完成日期：2026-05-27

- [x] **T1-07-06** `inbound-worker.ts` — **`finally` 仅 `channel=web` 时 `unregisterSink`**  
  - 验收：飞书 job 不访问 SinkRegistry；Web 行为不变
  - 完成日期：2026-05-27

- [x] **T1-07-07** E2E：飞书 @机器人 发问 → `message.reply` 收回复；与 Web 并发不串线；重复 **`event_id`** 幂等跳过  
  - > **搁置收口**：无飞书企业自建应用测试环境；代码保留，待有租户后补测；**不阻塞 T1 验收**  
  - 完成日期：2026-06-03

---

## T1-08 钉钉渠道

> **选型**：**企业内部应用 + 机器人 Stream 模式**（`dingtalk-stream` SDK，WebSocket，**无需公网 IP**）。  
> **对齐 T1-07**：复用同一 Inbound Queue + Worker + OutboundRouter；`chatOptions` / vendor 仍走服务端默认。

- [x] **T1-08-01** `channel.types` / `channel.schema` — `ChannelId` 增 **`dingtalk`**；`DingtalkChannelMeta`（含 **`msgId`、`conversationId`、`sessionWebhook`、`sessionWebhookExpiredTime`**；可选 `robotCode`、`conversationType`）  
  - 验收：parse 失败 throw；`payload.messages` + `chatOptions?` 与 Web 同构  
  - 完成日期：2026-05-27

- [x] **T1-08-02** `session-key.ts` — `buildDingtalkSessionKey(conversationId: string): string` → **`dingtalk:{conversationId}`**  
  - 验收：`dingtalk:{conversationId}` 格式正确（代码审查）  
  - 完成日期：2026-05-27

- [x] **T1-08-03** `channels/dingtalk/normalize-dingtalk-inbound.ts` — Stream 回调 **`/v1.0/im/bot/messages/get`** → `AgentMessageEnvelope`；**`idempotencyKey` = `msgId`**（header `messageId` 作辅）  
  - 验收：群聊 `@机器人` 文本 → `role: user`；单聊可入站；群未 @ 跳过；MVP 仅 **`msgtype=text`**（E2E / 代码审查）  
  - 完成日期：2026-05-27

- [x] **T1-08-04** `channels/dingtalk/dingtalk-channel.adapter.ts` — `sendOutbound`：chunk 聚合后 **`sessionWebhook` POST**（`msgtype=text`）；校验 `sessionWebhookExpiredTime`；失败时日志 + 可选 OAPI 回退（MVP 可先仅 webhook）  
  - 验收：无 `res.write`；回复落在同一会话  
  - 完成日期：2026-05-27

- [x] **T1-08-05** `channels/dingtalk/dingtalk-stream-listener.ts` — **`dingtalk-stream`** `DWClient` + `registerCallbackListener('/v1.0/im/bot/messages/get')`  
  - handler **仅** normalize + **`publishInbound`**，**禁止 await Harness**，快速 ACK；`bootstrap.ts` 启动  
  - `.env.example`：`DINGTALK_CLIENT_ID`、`DINGTALK_CLIENT_SECRET`（即 AppKey / AppSecret）  
  - 验收：Stream 在线；日志 `inbound enqueue channel=dingtalk`  
  - 完成日期：2026-05-27

- [x] **T1-08-06** `inbound-worker.ts` — 确认 **`finally` 仅 `channel=web` 时 `unregisterSink`**（钉钉 job 与飞书同路径，不访问 SinkRegistry）  
  - 验收：钉钉 job 不访问 SinkRegistry；Web 行为不变  
  - 完成日期：2026-05-27

- [x] **T1-08-07** E2E：钉钉单聊或群 @ 机器人 → `sessionWebhook` 收回复；与 Web 并发不串线；重复 **`msgId`** 幂等跳过  
  - 完成日期：2026-05-27

---

## PR 建议

| PR | 内容 |
|----|------|
| PR-1 | T1-01 + T1-02（含集成测试：publish → handler） |
| PR-2 | T1-03 + T1-04 + T1-05 |
| PR-3 | T1-06 |
| PR-4 | T1-07 飞书 |
| PR-5 | T1-08 钉钉 |

## 新建目录预期

```
src/channels/           bootstrap, registry, session-key, envelope-mapper, web/, feishu/, dingtalk/
src/message-bus/        redis-connection, queue-names, inbound-queue, inbound-worker,
                        idempotency, outbound-router, outbound-sink-registry
src/types/              channel.types.ts, channel.schema.ts
```
