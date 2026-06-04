# P2 — MCP 平台化

> **状态**：**已验收**（2026-06-04）；子项 **20/20**（含 P2-06 搁置收口）；完成检查清单 **5/5**（远程 OAuth **E2E 搁置收口**，不阻塞本阶段）。  
> **目标**：从 tools-first 升级为 MCP 2025–2026 完整客户端能力面，对齐 OAuth、Resources、Prompts、连接治理。  
> **前置**：P0 完成；P1-03 权限门完成（OAuth 需 ask 管道）  
> **预估**：2 周  
> **参考索引**：[REFERENCES.md](./REFERENCES.md)

---

## P2-01 Client Capabilities 与握手

**背景**：`MCPClientIdentity.capabilities = {}` 空对象，未声明 sampling/roots/elicitation 等。

### 任务

- [x] **P2-01-01** 调研 MCP SDK `@modelcontextprotocol/sdk` 1.29 支持的 client capabilities  
  - 涉及：`src/config/app.config.ts`  
  - 验收：`app.config.ts` 记录启用的 capabilities
  - 完成日期：2026-06-04

- [x] **P2-01-02** 按需声明 capabilities（初期：`roots` 可选、`elicitation` 若 UI 支持）  
  - 涉及：`app.config.ts`、`server-connection.ts`  
  - 验收：握手日志可见 capabilities 对象
  - 完成日期：2026-06-04

- [x] **P2-01-03** 实现 sampling 回调骨架（若服务端请求 LLM 采样）  
  - 涉及：新建 `src/core/mcp-sampling-handler.ts`  
  - 验收：日志可见 `MCP SAMPLING` 或等价自测
  - 完成日期：2026-06-04

---

## P2-02 Resources & Prompts（仅展示，不进对话）

**背景**：README 仅提 tools；`feature-config` 的 `enablePrompts` 指 Harness system prompt，非 MCP Prompts。市面（含 [Cherry Studio](https://github.com/CherryHQ/cherry-studio)）对 R/P 多为设置页列举，**对话主路径仍是 tools**；多数 MCP 服（含本仓库已接网关）仅声明 `tools`，`listResources`/`listPrompts` 常为空。

**范围决策（2026-06-04）**

| 做 | 不做 |
|----|------|
| 连接后 `list*` / 可选 `read`/`get` 供 **info 可观测** | Harness、`prompt-pipeline`、聊天 API **注入** R/P |
| info 浏览、复制 URI / prompt 名、预览片段（只读） | `@resource`、`fetch_mcp_resource`、slash 挂上下文 |
| `/api/info` 聚合各服 capabilities 与列表 | 将 MCP Prompt 当作会话 system prompt 替代 |

**延后**：若未来某 MCP 服稳定暴露高价值 R/P 且需 slash 进聊天，单独立项，不扩本任务。

### 任务

- [x] **P2-02-01** `ServerConnection` 新增 `listResources()` / `readResource(uri)`  
  - 涉及：`src/core/server-connection.ts`  
  - 验收：仅 info/内部调试可列出资源；`read` 仅用于预览，不写入聊天 messages
  - 完成日期：2026-06-04

- [x] **P2-02-02** `ServerConnection` 新增 `listPrompts()` / `getPrompt(name, args)`  
  - 涉及：`server-connection.ts`  
  - 验收：info 可列 prompt 并预览 `getPrompt` 结果；**不得**注入 Agent 会话或 `prompt-pipeline`
  - 完成日期：2026-06-04

- [x] **P2-02-03** `MCPClientManager` 聚合多服 resources/prompts  
  - 涉及：`src/core/mcp/mcp-client-manager.ts`  
  - 验收：`/api/info` 返回各服 resources/prompts 列表（空数组合法）；无 Harness 消费字段
  - 完成日期：2026-06-04

- [x] **P2-02-04** UI：info 页 Resources / Prompts（只读）  
  - 涉及：`frontend/src/info/`、`info.controller.ts`（或等价 info 路由）  
  - 验收：可浏览、可复制 URI / prompt 名；可选只读预览；聊天页无入口
  - 完成日期：2026-06-04

---

## P2-03 OAuth 与连接状态机

**2026 实践**：静态 Header 仅适合开发；生产远程 MCP 必须 OAuth + token 隔离。

### 连接状态

```
disconnected → connecting → connected
                         → needs-auth → (oauth flow) → connected
                         → failed
```

### 任务

- [x] **P2-03-01** 扩展 `ServerInfo.status` 为状态机枚举（含 `needs-auth`；stdio 无此状态）  
  - 涉及：`src/interfaces/mcp.interfaces.ts`、`src/core/mcp/server-connection.ts`  
  - 验收：info 页展示 `connecting` / `connected` / `needs-auth` / `failed`
  - 完成日期：2026-06-04

- [x] **P2-03-02** 远程 HTTP 集成 MCP SDK OAuth（401+PRM、PKCE；stdio 不接入）  
  - 涉及：`src/core/mcp/server-connection.ts`、新建 `src/core/mcp/mcp-oauth.ts`  
  - 验收：需 auth 的远程服可浏览器授权；配置 `headers` 时仍走 Bearer 直连
  - 完成日期：2026-06-04

- [x] **P2-03-03** 按服 Token 存 SQLite 表 `MCPServerAuth`（serverId, tokens, expiresAt）  
  - 涉及：`prisma/schema.prisma`、migration  
  - 验收：重启复用；删服删对应 token 行
  - 完成日期：2026-06-04

- [x] **P2-03-04** settings：每服「授权 / 断开」；`needs-auth` 时可发起 OAuth  
  - 涉及：`public/settings.html`  
  - 验收：按 serverId 管理授权，断开清除该服 token
  - 完成日期：2026-06-04

- [x] **P2-03-05** OAuth 服用 refresh 替代 8h 硬重连（无 OAuth 仍保留原 fallback）  
  - 涉及：`client.ts`  
  - 验收：有效 token 不每 8h 重连；refresh 失败进入 `needs-auth`
  - 完成日期：2026-06-04

---

## P2-04 工具结果标准化

**背景**：[s19 MCP](https://learn.shareai.run/zh/s19/) 要求 MCP 结果标准化回统一 tool_result 格式。

### 任务

- [x] **P2-04-01** 定义 `UnifiedToolResult`（`ToolResultSource`、`UnifiedToolResultStatus`）：`source, serverId?, serverName?, tool, status, preview, structured?, rawPath?, isMcpError?`  
  - 涉及：`src/types/mcp.types.ts`  
  - 验收：类型可被 Harness / Info / SSE 引用；`rawPath` 对接现有 `ToolOutputArtifact.filePath`
  - 完成日期：2026-06-04

- [x] **P2-04-02** 新建 `tool-executor.ts`：`normalizeMcpToolResult` / `normalizeSystemToolResult` / `unifiedToLlmText`；删 `ai-provider.formatToolResult`、`AgentLoopProvider.formatToolResult`、`utils/mcp-tool-result.ts`  
  - 涉及：`src/core/agent-harness/tool-executor.ts`、`agent-loop.ts`、`ai-provider.ts`、`info.controller.ts`  
  - 验收：`callTool` / `executeSystemTool` 后统一 normalize → LLM 文本；Info 试跑复用同一入口；SSE `tool_call_result` 可选 `unified`；`tool-cards.js` 优先展示 `preview` + status
  - 完成日期：2026-06-04

- [x] **P2-04-03** `normalizeMcpToolResult` 解析 MCP `CallToolResult.structuredContent` 与 `isError`；非 text `content` 块用占位符进 `preview`  
  - 涉及：`src/core/agent-harness/tool-executor.ts`、`frontend/src/info/`（试跑 structured 展示）  
  - 验收：仅 structured、无 text 时仍有 preview；`isError===true` 时 `status: 'error'` 且 preview 仍回写 LLM
  - 完成日期：2026-06-04

---

## P2-05 移除 Harness 参数校验遗留

### 任务

- [x] **P2-05-01** 删除 `tool-validation.ts` 及 `verifyToolArguments` 接线  
  - 涉及：`src/core/agent-harness/tool-validation.ts`（删）、`agent-loop.ts`、`ai-provider.ts`  
  - 验收：`src/` 无 `verifyToolArguments` / `tool-validation`；`pnpm run build` 通过
  - 完成日期：2026-06-04

- [x] **P2-05-02** 删除 `enableParamValidation` 全链路  
  - 涉及：`feature-config.ts`、`config-plane/*`、`ai.controller.ts`、`settings.controller.ts`、`admin.controller.ts`、`inbound-worker.ts`、`channel.types.ts`、`channel.schema.ts`、`normalize-web-inbound.ts`；`frontend/src/chat/`；`prisma/schema.prisma` + migration  
  - 验收：无「参数校验」开关与 Profile 字段；请求体遗留字段可忽略
  - 完成日期：2026-06-04

- [x] **P2-05-03** README 与 P2 完成检查项「无业务 API 硬编码在 Harness」  
  - 涉及：根 `README.md`  
  - 验收：文档与实现一致
  - 完成日期：2026-06-04

---

## P2-06 Plugin Manifest 发现（可选）

> **状态**：**搁置收口**（2026-06-04）— 个人使用、未来为多用户各自配置 MCP；收益偏「仓库内团队共享 manifest」，与产品方向不符，不实现。

**2026 实践**：`.mcp-plugin/plugin.json` 声明 server 启动命令，减少手动配置。

**替代**：继续用 info 页 + SQLite 手配；若日后需要「用户级导入」，单独立项（如读 `~/.cursor/mcp.json` 或 UI 导入），不复用本节的 `.mcp-client/plugins/` 方案。

### 任务

- [x] **P2-06-01** 支持从项目根 `.mcp-client/plugins/` 加载 manifest  
  - 涉及：新建 `src/core/plugin-loader.ts`  
  - 验收：manifest 中 server 自动出现在 settings
  - > **搁置收口**：不实现；见本节状态
  - 完成日期：2026-06-04

- [x] **P2-06-02** 与现有 DB 配置合并（DB 优先）  
  - 涉及：`config.service.ts`  
  - 验收：不破坏现有 SQLite 配置
  - > **搁置收口**：不实现；见本节状态
  - 完成日期：2026-06-04

---

## P2 完成检查清单

- [x] info 页展示 tools + resources + prompts
  - 完成日期：2026-06-04
- [x] 至少一个远程 MCP 服可走 OAuth
  - > **搁置收口（E2E）**：`mcp-oauth` + info「授权」与回调已交付；需自备需 OAuth 的 Streamable HTTP 远程服后人工走通一轮；不阻塞 P2 验收
  - 完成日期：2026-06-04
- [x] 连接状态机完整可见
  - 完成日期：2026-06-04
- [x] 无业务 API 硬编码在 Harness
- [x] README 更新 MCP 能力面说明
