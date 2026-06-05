# P3 — Agent 运行时进阶

> **目标**：补齐会话规划、跨会话 Memory、服务端会话、Skill 按需加载，使 Client 具备完整 Agent 工作流能力。  
> **前置**：P1 完成（至少压缩 + Prompt 流水线 + Hook）  
> **预估**：3 周  
> **定位说明**：多 Agent 团队（[s15](https://learn.shareai.run/zh/s15/)–[s18](https://learn.shareai.run/zh/s18/)）不在本阶段 — 更适合 IDE/服务端，Client 聚焦「单 Agent + MCP 网关」  
> **参考索引**：[REFERENCES.md](./REFERENCES.md)

---

## P3-01 会话内规划 Todo

> 参考：[s03 Planning / Todo](https://learn.shareai.run/zh/s03/)  
> 设计稿（非生产）：`frontend/design/planning-panel-mockup.html`

**背景**：复杂 MCP 工作流（多 API 串联）无显式计划，模型易漂移、重复调用。主流 Client 用对话 **inline** 展示 Todo，长对话易被工具卡埋掉；本 Client 采用 **状态外置 + 固定入口 UI**，且 **不污染会话历史**。

### 架构原则（SSOT 与边界）

| 层 | 规则 |
|----|------|
| **真相源** | 仅以 `PlanningState.items` 为准；`todo` 工具只改此状态 |
| **用户看计划** | SSE `planning_update` → 计划浮层 UI；**不**从对话 JSON / 气泡文本解析列表 |
| **会话历史** | 同一条 assistant 消息内 **至多一张** 轻量 `todo` 工具卡（原地更新）；存盘 **合并** 多次 `todo` 为一条摘要，避免刷新后多张卡堆叠 |
| **模型通道** | `tool_result` / `harness_reminder` **可控载荷**（见 P3-01-05）；禁止把整表 items 反复写入可回放 transcript |

### 任务

- [x] **P3-01-01** Harness 内置 `todo` 工具（`system-tool-registry`）  
  - Schema：`merge` + `items[{ id, content, status, activeForm? }]`（`pending` / `in_progress` / `completed`）  
  - 约束：至多 1 个 `in_progress`；最多 20 条；校验失败 `throw`  
  - 涉及：`agent-harness/system-tools/todo-tool.ts`、`planning-state.ts`  
  - 验收：`merge: true` 按 `id` 更新；`merge: false` 整表替换；双 `in_progress` 被拒绝

- [x] **P3-01-02** `PlanningState` 独立于 messages（`items[]`、`roundsSinceUpdate`）  
  - 涉及：`loop-state.ts`、`planning-state.ts`；`todo` 成功后 `roundsSinceUpdate = 0`；`onPlanningUpdated` → SSE `planning_update`  
  - 验收：计划状态不依赖从 `messages[]` 反解析；初版已注入 `harness_reminder`（**全量 items 载荷待 P3-01-05 收敛**）

- [x] **P3-01-03** 连续 3 轮未调用 `todo` 时注入 `harness_reminder`（`kind: plan_refresh`）  
  - 涉及：`agent-loop.ts`、`planning-state.ts`（`finalizePlanningAfterToolRound`）  
  - 验收：审计可检索 `plan_refresh`；reminder 语义保留，**载荷形态以 P3-01-05 为准**

- [x] **P3-01-04** UI：计划浮层（`planning_update` 驱动，对齐设计稿）  
  - 入口：`#chat-messages` **右上角外侧**（与聊天框留间距、不重叠）；平时 **胶囊**（进度 + 未完成数）  
  - 交互：点击向右下展开面板；高度 `min(内容, 视口剩余)`，**列表无内滚条**；收起后入口仍在  
  - 布局：`fixed` 挂 `body`，**不挤占** `chat-container` 宽度  
  - 涉及：`frontend/src/chat/ui/planning-panel.js`、`chat-ui.css`、`api.js`  
  - 验收：SSE 驱动原地刷新；无计划时入口隐藏；长对话滚动时入口锚点仍对齐消息区右上

- [x] **P3-01-05** Harness：`todo` 与会话 transcript 载荷治理  
  - `formatTodoToolResult`：仅返回 **一行摘要**（如「已更新 N 项」），**禁止**整表 items 文本进入 `messages[]`  
  - `harness_reminder`：改为短句或不含全量 `items`；若仍进当轮 `messages`，须 **不写入** 前端持久化 transcript（与 P3-01-06 一致）  
  - 涉及：`planning-state.ts`、`todo-tool.ts`、`agent-loop.ts`；必要时 `message-normalizer` / 存盘路径  
  - 验收：同会话多轮 `todo` 后，持久化 assistant 条目不因计划条目数线性膨胀；模型仍可通过 `todo` 工具读写计划

- [x] **P3-01-06** 前端：`todo` 工具卡与会话历史合并  
  - 流式：同一条 AI 消息内 `name===todo` **单槽**（`data-todo-slot`），再次调用 **原地更新** 摘要与「第 N 次更新」角标，不 `append` 第二张卡  
  - 持久化：`TurnCollector` 同轮多次 `todo` **合并为一条** `toolCalls` 记录；历史回放仍只见一张卡  
  - 卡片文案：一行摘要 + 指向右上「计划」；**不**展示完整 items 列表  
  - 涉及：`tool-cards.js`、`turn-collector.js`、`renderers.js`（历史渲染）  
  - 验收：设计稿步骤 2→6 行为；刷新会话后该 assistant 轮仍单卡；外侧浮层为列表主视图

---

## P3-02 跨会话 Memory

> 参考：[s09 Memory](https://learn.shareai.run/zh/s09/)

**背景**：IndexedDB 仅存聊天 UI 状态，无「用户偏好 / 项目约定」层。

### 存储边界（必须遵守）

| 存 | 不存 |
|----|------|
| 用户偏好、明确纠正、非显然项目约定 | 文件结构、当前任务进度、临时分支名、密钥 |

### 任务

- [ ] **P3-02-01** 新建 `src/core/memory/memory-store.ts` — 文件型或 SQLite  
  - 路径建议：`.mcp-client/memory/*.md` + 索引  
  - 涉及：新建模块  
  - 验收：CRUD + 按 type 过滤（user/feedback/project/reference）

- [ ] **P3-02-02** Harness 工具 `save_memory` / `list_memory`  
  - 涉及：`agent-harness/system-tools/memory-tool.ts`  
  - 验收：模型可写入跨会话事实

- [ ] **P3-02-03** `SystemPromptBuilder._buildMemory()` 会话开始时加载  
  - 涉及：`prompt-pipeline.ts`  
  - 验收：新会话可见相关 memory 摘要

- [ ] **P3-02-04** settings 页 Memory 管理（查看/删除/忽略本次）  
  - 涉及：`public/settings.html`  
  - 验收：用户说「忽略 memory」时不注入

- [ ] **P3-02-05** Memory 与代码冲突时优先当前观察  
  - 涉及：`prompt-pipeline.ts`  
  - 验收：冲突时 `_source: 'reminder'` 注入 `harness_reminder`（`kind: memory_conflict`）；规则写入 PromptBuilder 注释

---

## P3-03 Skill 按需加载

> 参考：[s05 Skills](https://learn.shareai.run/zh/s05/)

**背景**：项目已有 `.claude/skills/`（Cursor 用），Client 自身无 Skill 发现/加载。

### 任务

- [ ] **P3-03-01** 新建 `src/core/skills/skill-registry.ts`  
  - 扫描：`skills/**/SKILL.md` 或 `.claude/skills/**/SKILL.md`  
  - 解析 frontmatter：name, description  
  - 涉及：新建模块  
  - 验收：启动时加载 manifest

- [ ] **P3-03-02** Prompt 只注入 Skill 目录（name + description），非全文  
  - 涉及：`prompt-pipeline.ts`  
  - 验收：prompt 体积不随 skill 数量线性爆炸

- [ ] **P3-03-03** Harness 工具 `load_skill(name)` → tool_result 注入正文  
  - 涉及：`agent-harness/system-tools/skill-tool.ts`  
  - 验收：模型按需加载 `dynamic-api-gateway` 等 skill

- [ ] **P3-03-04** settings 页配置 Skill 扫描路径  
  - 涉及：`feature-config.ts`  
  - 验收：可禁用 skill 系统

---

## P3-04 服务端会话持久化

**背景**：后端无会话存储，每次 API 无状态；IndexedDB 无法跨设备。

**2026 实践**：Harness 状态持久化到 disk，crash 可恢复（[s11 Error Recovery](https://learn.shareai.run/zh/s11/) 补充）。

### 任务

- [ ] **P3-04-01** Prisma 新增 `ChatSession` / `ChatMessage` 模型  
  - 字段：sessionId, role, content, toolCallsJson, reasoning, createdAt  
  - 涉及：`prisma/schema.prisma`  
  - 验收：migration 成功

- [ ] **P3-04-02** API：`POST /api/sessions`、`GET /api/sessions/:id/messages`  
  - 涉及：`src/api/` 新 controller  
  - 验收：消息 CRUD 可用

- [ ] **P3-04-03** 前端双写：IndexedDB + 服务端（服务端为主）  
  - 涉及：`frontend/src/chat/data.js`  
  - 验收：换浏览器可拉取历史

- [ ] **P3-04-04** Harness checkpoint：每轮结束异步持久化 LoopState  
  - 涉及：`agent-loop.ts`、`session-store.ts`  
  - 验收：进程重启后可恢复未完成会话（可选续跑）

---

## P3-05 子 Agent 上下文隔离（轻量版）

> 参考：[s04 Subagent](https://learn.shareai.run/zh/s04/)

**背景**：探索性 MCP 查询（listAllApis → 多次 getApiDetails）污染主上下文。

**Client 定位**：不做完整 subagent 框架，提供 **「调研模式」** 一次性子循环。

### 任务

- [ ] **P3-05-01** Harness 工具 `research_task(prompt)` — 独立 messages 跑 N 轮后只返回摘要  
  - 涉及：`agent-harness/sub-research.ts`  
  - 验收：主会话 messages 不含中间 tool 噪声

- [ ] **P3-05-02** 子循环限制：max 5 轮、只读工具集、禁止嵌套  
  - 涉及：`sub-research.ts`  
  - 验收：超限返回 partial summary

- [ ] **P3-05-03** UI 标注「调研任务」卡片  
  - 涉及：`frontend/src/chat/renderers.js`  
  - 验收：用户可见子任务边界

---

## P3-06 API 安全基线

**2026 实践**：Web Agent Client 上线前最低安全要求。

### 任务

- [ ] **P3-06-01** API Key 或 Session Token 鉴权中间件  
  - 涉及：`src/app.ts`、`.env.example`  
  - 验收：无 token 返回 401

- [ ] **P3-06-02** CORS 限制为配置域名  
  - 涉及：`src/app.ts`  
  - 验收：非白名单 origin 拒绝

- [ ] **P3-06-03** Rate limit（express-rate-limit 或自研）  
  - 涉及：`src/app.ts`  
  - 验收：防滥用基础能力

---

## P3-07 Provider 扩展

**背景**：Prisma 仅 `OPENAI` enum；2026 需支持 Anthropic Messages API、多模态等。

### 任务

- [ ] **P3-07-01** 抽象 `ILLMProvider` 接口，OpenAI 为首个实现  
  - 涉及：新建 `src/core/llm-providers/`  
  - 验收：Harness 只依赖接口

- [ ] **P3-07-02** 恢复并统一 `temperature` / `max_tokens` / `top_p` 配置链  
  - 涉及：Provider 实现、settings  
  - 验收：各参数端到端生效

- [ ] **P3-07-03** Prisma `ProviderType` 扩展（ANTHROPIC 等）— 按需  
  - 涉及：`schema.prisma`  
  - 验收：settings 可选多 provider 类型

---

## P3 完成检查清单

- [x] Todo 计划可外显、可提醒、历史不膨胀
- [ ] Memory 跨会话生效且边界清晰
- [ ] Skill 按需加载，prompt 不膨胀
- [ ] 服务端会话可存取
- [ ] API 有基本鉴权
- [ ] 调研模式可减噪
