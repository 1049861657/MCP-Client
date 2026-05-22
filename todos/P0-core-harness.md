# P0 — 核心 Harness 加固

> **目标**：在不改变产品定位的前提下，把 Agent Loop 从 `openai.ts` 中抽离，补全消息链，对齐 2026 Harness「控制面与 Provider 分离」模式。  
> **预估**：2 周  
> **阻塞后续**：P1 全部、P2 部分  
> **参考索引**：[REFERENCES.md](./REFERENCES.md)

---

## P0-01 Agent Harness 模块拆分

**背景**：`src/servers/openai.ts` 约 1500 行，混合了 LLM 调用、工具循环、参数校验、流式解析。OpenAI Agents SDK 2026 共识是 Harness 拥有 orchestration，Provider 只管 model I/O。

**建议目录结构**

```
src/core/agent-harness/
  loop-state.ts          # LoopState: messages, turnCount, transitionReason
  agent-loop.ts          # runAgentLoop(): 主循环入口
  tool-executor.ts       # 并行执行、结果收集
  message-normalizer.ts  # API 发送前规范化
  types.ts               # ILoopState, IToolCallRecord 等
```

### 任务

- [x] **P0-01-01** 创建 `src/core/agent-harness/types.ts`，定义 `ILoopState`、`ITransitionReason`、`IRecoveryState` 骨架  
  - 涉及：`src/core/agent-harness/types.ts`（新建）  
  - 验收：`turnCount`、`transitionReason: 'tool_result' | 'end' | null` 类型完整  
  - 完成日期：2026-05-21

- [x] **P0-01-02** 从 `openai.ts` 抽出 `ToolCallManager` 相关逻辑到 `tool-executor.ts`  
  - 涉及：`src/servers/openai.ts`、`src/core/agent-harness/tool-executor.ts`  
  - 验收：`chatStream` 行为不变，现有 SSE 事件格式兼容  
  - 完成日期：2026-05-21

- [x] **P0-01-03** 实现 `agent-loop.ts`，`chatStream` 改调 Harness 入口  
  - 涉及：`src/servers/openai.ts`、`src/core/agent-harness/agent-loop.ts`  
  - 验收：流式多轮工具调用回归通过；`MAX_TOOL_CALL_ROUNDS` 可配置化  
  - 完成日期：2026-05-21

- [x] **P0-01-04** `openai.ts` 瘦身：仅保留 Provider 层（`createRequestParams`、`processModelResponse`、流式解析）  
  - 涉及：`src/servers/openai.ts`  
  - 验收：文件行数降至 800 行以内；无循环业务逻辑残留  
  - 完成日期：2026-05-21

---

## P0-02 消息规范化层

**背景**：[s02 Tool Use](https://learn.shareai.run/zh/s02/) 指出 API 有三条硬性约束——tool_use/tool_result 配对、user/assistant 严格交替、剥离内部字段。取消请求、压缩替换后易触发 400。

**2026 实践**：内部 `messages[]` 与 API `messages[]` 分离；发送前 `normalizeMessages()`。

### 任务

- [x] **P0-02-01** 实现 `message-normalizer.ts`  
  - 功能：剥离 `_internal` / `_timestamp`；补齐缺失 tool_result（占位 `(cancelled)`）；合并连续同角色消息  
  - 涉及：`src/core/agent-harness/message-normalizer.ts`  
  - 验收：单元测试覆盖三种约束；取消 mid-tool 后不 400  
  - 完成日期：2026-05-21

- [x] **P0-02-02** 所有 LLM API 调用前统一 `normalizeMessages()`  
  - 涉及：`agent-loop.ts`、`openai.ts`  
  - 验收：`grep normalizeMessages` 仅 Harness 一处出口  
  - 完成日期：2026-05-21

- [x] **P0-02-03** 定义内部消息扩展字段规范（文档注释即可）  
  - 涉及：`types.ts`  
  - 验收：`IMessageBlock._source?: 'user' | 'tool' | 'reminder' | 'compact'` 等  
  - 完成日期：2026-05-21

---

## P0-03 完整消息历史链

**背景**：`HistoryConfig.enableMessageHistory` 默认 `false`；前端 IndexedDB 存会话但不传 `tool_calls` / `tool` / `reasoning_content`。多轮 Agent 等于每轮失忆。

**2026 实践**：GitHub Copilot Agent Mode 强调 complete context graph；Harness 状态持久化跨 turn。

### 任务

- [x] **P0-03-01** 扩展前端会话模型，存储完整 turn 结构  
  - 字段：`role`、`content`、`tool_calls[]`、`tool_call_id`、`reasoning_content`  
  - 涉及：`public/js/ai-data.js`、`public/js/ai-core.js`、`public/js/ai-turn-collector.js`、`public/js/message-history-builder.js`  
  - 验收：刷新页面后工具调用卡片可完整回放  
  - 完成日期：2026-05-21

- [x] **P0-03-02** 请求体携带完整 `messages` 数组（含 tool 消息）  
  - 涉及：`public/js/ai-api.js`、`src/api/openai.controller.ts`  
  - 验收：Network 面板可见 `tool` role 消息  
  - 完成日期：2026-05-21

- [x] **P0-03-03** 将 `enableMessageHistory` 默认改为 `true`，条数默认 20（可配置）  
  - 涉及：`src/config/feature-config.ts`、`public/ai.html`、`public/js/ai-ui.js`  
  - 验收：新会话自动带上文；设置页可调整条数  
  - 完成日期：2026-05-21

- [x] **P0-03-04** Harness 构建上下文时保留 reasoning（若模型支持）  
  - 涉及：`agent-loop.ts`、`types.ts`（`reasoning_content` 扩展）；跨 turn 由前端 history 回传  
  - 验收：DeepSeek reasoning 模型多轮 reasoning 不丢  
  - 完成日期：2026-05-21

---

## P0-04 非流式路径对齐

**背景**：`chat()` 仅 1 轮工具调用；且历史路径可能存在 `callTool(toolName)` 未用 `codeName` 的多服路由问题。

### 任务

- [x] **P0-04-01** `chat()` 复用 `agent-loop.ts`，支持完整多轮（与流式共享逻辑）  
  - 涉及：`src/servers/openai.ts`、`agent-loop.ts`  
  - 验收：非流式 3 轮工具调用返回最终文本  
  - 完成日期：2026-05-22

- [x] **P0-04-02** 审计所有 `callTool` 调用，统一使用 `codeName`  
  - 涉及：`src/servers/openai.ts`、`src/core/client.ts`  
  - 验收：`grep callTool` 无裸 toolName 路由  
  - 完成日期：2026-05-22

- [x] **P0-04-03** 修复 `createRequestParams` 中 `temperature` / `max_tokens` 被注释问题  
  - 涉及：`src/servers/openai.ts` L670-671  
  - 验收：API 请求体含正确参数；设置页值生效  
  - 完成日期：2026-05-22

---

## P0-05 Loop 状态显式化

**背景**：[s01 Agent Loop](https://learn.shareai.run/zh/s01/) 强调 `transitionReason` 不应只依赖 `stop_reason`；完整系统需显式续行状态。

### 任务

- [x] **P0-05-01** 实现 `LoopState` 并在每轮结束后更新 `transitionReason`  
  - 涉及：`loop-state.ts`、`agent-loop.ts`  
  - 验收：日志可输出 `{ turn, reason, toolCount }`
  - 完成日期：2026-05-22

- [x] **P0-05-02** 达到 `MAX_TOOL_CALL_ROUNDS` 时写入结构化状态而非仅 UI 提示  
  - 涉及：`agent-loop.ts`  
  - 验收：SSE 事件 `type: "max_tool_calls_reached"` 含 `round`、`partialResults`
  - 完成日期：2026-05-22

- [x] **P0-05-03** `MAX_TOOL_CALL_ROUNDS` 移至配置（Setting 或 `feature-config.ts`），默认 25  
  - 涉及：`src/config/feature-config.ts`  
  - 验收：设置页可配置；2026 实践建议高于 10 以支撑复杂 MCP 工作流
  - 完成日期：2026-05-22

---

## P0-06 基础可观测性

**2026 实践**：每次 tool call 结构化审计，便于生产排障。

### 任务

- [x] **P0-06-01** 新增 `ToolCallAuditLog` 结构并写入 Winston  
  - 字段：`requestId`、`round`、`toolName`、`codeName`、`serverId`、`durationMs`、`success`、`error`  
  - 涉及：`src/utils/logger.ts` 或 `src/core/agent-harness/audit.ts`  
  - 验收：`logs/app.log` 含 JSON 行审计记录
  - 完成日期：2026-05-22

- [x] **P0-06-02** SSE 推送 `requestId` 供前端关联  
  - 涉及：`openai.controller.ts`、`public/js/ai-api.js`  
  - 验收：单次对话所有 chunk 共享同一 `requestId`
  - 完成日期：2026-05-22

---

## P0 完成检查清单

- [ ] 流式 + 非流式工具循环行为一致
- [ ] 10+ 轮工具对话上下文完整
- [ ] 取消请求不导致后续 API 400
- [ ] `openai.ts` 职责清晰（Provider only）
- [ ] README 补充 Harness 架构说明
