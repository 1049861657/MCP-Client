# T1 — 渠道层 + 消息总线层（Web 单渠道 MVP）

> **状态**：进行中  
> **范围**：渠道接入 + 异步总线；**当前仅 Web**  
> **前置**：P0 完成（`agent-harness`、`InternalMessage`、SSE 已可用）；可与 P1 并行  
> **预估**：2–3 周（**20** 子项，建议 2–3 个 PR）  
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

## 已拍板决策（新对话按此执行，勿再讨论）

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
| 非流式 `/api/chat` | **T1 不改**；Controller 注释 `TODO T2`；T2 与 stream 对齐 |
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
| Session 持久化 | T1 仍用 body **`messages[]`** | P3-04（T2 IM 前置） |

**BullMQ**：`maxRetriesPerRequest: null`；`attempts` + 指数退避；`removeOnComplete` / `removeOnFail`。

**Gateway 参考**（不依赖）：OpenClaw Channel Plugin、MessagingGateway Ports。

---

## Envelope 形状（实现依据）

**入站 `AgentMessageEnvelope`（Web）**

```typescript
{
  id: string;              // UUID，与 requestId 可相同
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
| Web Adapter、Envelope、Inbound Queue + Worker、OutboundRouter + SinkRegistry | 飞书/钉钉、Channel Registry、独立 Outbound Queue |
| 幂等 + traceId | 改 `public/js/ai-api.js` |

1. Harness 只接 `InternalMessage[]`，出 `ChunkResponse`  
2. Web 行为与改造前一致  
3. 接口按多渠道设计，T1 只实现 `web`

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

`T1-01 → T1-02 → T1-03 → T1-04 → T1-05 → T1-06`（T1-04 前须完成 01–03；01 与 02 可并行）

---

## 必读代码（动手前）

| 文件 | 看什么 |
|------|--------|
| `src/api/ai.controller.ts` | `chatStream` 请求体、SSE 帧、`abortController`、`requestId` |
| `src/providers/ai-provider.ts` | `chatStream(...)` 签名与 `onChunk` 回调 |
| `src/core/agent-harness/types.ts` | `InternalMessage`、`ChunkResponse` |
| `src/core/agent-harness/message-normalizer.ts` | Worker 输出前仍走 normalize |
| `public/js/ai-api.js` | 消费 `begin` / `data` / `usage` / `done`（**不改**） |

---

## T1-01 契约与目录

- [ ] **T1-01-01** `src/types/channel.types.ts` + `channel.schema.ts` — 入站/出站类型与 zod（见 Envelope）；**`payload.messages` 必填**，`chatOptions` 字段均 `.optional()`  
  - 验收：parse 失败 throw；无 `any`

- [ ] **T1-01-02** `src/channels/session-key.ts` — `buildWebSessionKey(requestId: string): string` → `web:${requestId}`  
  - 验收：单测

- [ ] **T1-01-03** `src/channels/types.ts` — `ChannelAdapter`、`InboundPort`  
  - `ChannelAdapter`：`readonly channel`、`sendOutbound(envelope)`、`registerSink`/`unregisterSink`（Web 专用可放 web 子模块）

- [ ] **T1-01-04** `src/message-bus/types.ts` — `MessageBus.publishInbound`；`OutboundRouter.route`  
  - `outbound-sink-registry.ts` — `register` / `get` / `unregister`（**unregister 幂等**）

---

## T1-02 消息总线（Inbound）

- [ ] **T1-02-01** `redis-connection.ts`；`queue-names.ts`（**`REDIS_KEY_PREFIX='mcp-client'`**、inbound 队列名）；`.env.example`：`REDIS_URL`、`INBOUND_WORKER_CONCURRENCY`  
  - BullMQ **`prefix: REDIS_KEY_PREFIX`**；**禁止** ioredis `keyPrefix`  
  - 验收：无 `REDIS_URL` 启动 throw；Redis 里新 key 以 `mcp-client` 开头

- [ ] **T1-02-02** `inbound-queue.ts` — `publishInbound`、`startInboundWorker`；Worker **`concurrency`** 读 env/常量；`jobId = idempotencyKey`  
  - 验收：**集成测试** `publishInbound` → handler 收到同一 envelope（作为 PR-1 基线）

- [ ] **T1-02-03** `idempotency.ts` — **`mcp-client:idem:{idempotencyKey}`**，`SET NX EX 86400`  
  - 验收：重复 jobId 跳过；key 自动过期；GUI 可见 `mcp-client:idem:*`

- [ ] **T1-02-04** enqueue/dequeue 日志：`traceId`、`sessionKey`、`channel`、`requestId`

- [ ] **T1-02-05** `bootstrap.ts`（或 `message-bus/index.ts`）导出 **`startMessageBus()`**：`startInboundWorker(inbound-worker)`；**`app.ts` 启动时调用**（与 T1-03-03 同 PR 亦可）  
  - 验收：进程启动后 Worker 已订阅队列

---

## T1-03 Web 渠道 Adapter

- [ ] **T1-03-01** `src/channels/web/normalize-web-inbound.ts` — `req.body` + `requestId` + `AbortSignal` → Envelope  
  - 验收：单测覆盖 `messages[]` 与 chatOptions 字段

- [ ] **T1-03-02** `src/channels/web/web-channel.adapter.ts` — `sendOutbound` 按 kind 写 SSE（复用现网 write 逻辑，可从 controller 抽取）  
  - 验收：与现网帧格式 byte-level 一致（可快照测试）

- [ ] **T1-03-03** `bootstrap.ts` + `registry.ts` — 注册 web Adapter；**不含** Worker 启动（见 T1-02-05）  
  - 验收：`app.ts` 调用 channel bootstrap

- [ ] **T1-03-04** `ai.controller.ts` — `chatStream`：SSE 头 + `begin` → `register` → `publishInbound`（**try/catch**：失败 → `event:error` + unregister + end）  
  - 成功后启动 **15s SSE comment keep-alive** 定时器，`done`/`error`/`close` 清除  
  - `res.on('close')`：**仅 abort**，不 unregister  
  - 验收：Redis 不可用时客户端收到 error 而非挂起；长推理期间连接不被 nginx  idle 断开

---

## T1-04 Agent 集成（Inbound Worker）

- [ ] **T1-04-01** `inbound-worker.ts` — `getSink(requestId)` 为 null **或** `abortSignal.aborted` → 跳过 Harness；否则 `pickDefined(chatOptions)` + `chatStream`  
  - 验收：客户端抢先断开时不崩溃；abort 仍中止 Loop

- [ ] **T1-04-02** `envelope-mapper.ts` — messages + **`pickDefined(chatOptions)`**  
  - 验收：与改前 API 行为一致；无多余 `undefined` 入参

- [ ] **T1-04-03** onChunk → Router；usage/done/error；**finally unregister**（幂等）  
  - 验收：流式 chunk 不丢

---

## T1-05 Outbound Router

- [ ] **T1-05-01** `src/message-bus/outbound-router.ts` — `channel === 'web'` → `WebChannelAdapter.sendOutbound`  
  - 验收：Harness/Worker 无 `res.write`

- [ ] **T1-05-02** **`POST /api/chat` T1 不改**；`ai.controller.ts` 方法顶注释 `// TODO T2: 接入 Envelope + Bus，与 chatStream 对齐`  
  - 验收：非流式路径行为与改造前完全一致

---

## T1-06 验收

- [ ] **T1-06-01** E2E：多轮 tool + SSE + abort + 重复 request（幂等）+ 与改造前行为一致

- [ ] **T1-06-02** 更新 [ROADMAP.md](./ROADMAP.md) 架构图（API ↔ Bus ↔ Harness）

---

## 完成检查

- [ ] `chatStream` 全链路：Envelope → BullMQ → Worker → Router → Sink → SSE
- [ ] Harness / `agent-loop` 无 `channel` 分支
- [ ] 未引入第三方 Gateway 依赖

## T2（备忘）

飞书 `@larksuiteoapi/node-sdk`、钉钉 `dingtalk-stream` — 前置 **T1 + P3-04**；Outbound 独立队列、Channel Registry 见 T2 任务书。

## PR 建议

| PR | 内容 |
|----|------|
| PR-1 | T1-01 + T1-02（含集成测试：publish → handler） |
| PR-2 | T1-03 + T1-04 + T1-05 |
| PR-3 | T1-06 |

## 新建目录预期

```
src/channels/           bootstrap, registry, session-key, envelope-mapper, web/
src/message-bus/        redis-connection, queue-names, inbound-queue, inbound-worker,
                        idempotency, outbound-router, outbound-sink-registry
src/types/              channel.types.ts, channel.schema.ts
```
