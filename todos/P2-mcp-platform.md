# P2 — MCP 平台化

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

- [ ] **P2-03-01** 扩展 `ServerInfo.status` 为状态机枚举  
  - 涉及：`src/interfaces/mcp.interfaces.ts`、`server-connection.ts`  
  - 验收：info 页显示精确状态

- [ ] **P2-03-02** 集成 MCP SDK OAuth 流程（Streamable HTTP transport）  
  - 涉及：`server-connection.ts`、新建 `src/core/mcp-oauth.ts`  
  - 验收：需 auth 的服务器可完成浏览器授权

- [ ] **P2-03-03** Token 存储：SQLite 新表 `MCPServerAuth`（serverId, tokens, expiresAt）  
  - 涉及：`prisma/schema.prisma`、migration  
  - 验收：重启后 token 有效可复用

- [ ] **P2-03-04** settings 页：OAuth 连接按钮 + 断开  
  - 涉及：`public/settings.html`  
  - 验收：用户可视化管理授权

- [ ] **P2-03-05** 8 小时定时重连改为「token 即将过期时刷新」（保留 cookie 场景 fallback）  
  - 涉及：`client.ts`  
  - 验收：OAuth 服不每 8h 硬重连

---

## P2-04 工具结果标准化

**背景**：[s19 MCP](https://learn.shareai.run/zh/s19/) 要求 MCP 结果标准化回统一 tool_result 格式。

### 任务

- [ ] **P2-04-01** 定义 `IUnifiedToolResult`：`source, server, tool, status, preview, rawPath?`  
  - 涉及：`src/interfaces/mcp.interfaces.ts`  
  - 验收：Harness 只消费统一格式

- [ ] **P2-04-02** `formatToolResult()` 迁移到 `tool-executor.ts` 并输出统一结构  
  - 涉及：`openai.ts` → harness  
  - 验收：UI 渲染层适配新结构

- [ ] **P2-04-03** 支持 MCP `structuredContent`（若 SDK 1.29 已支持）  
  - 涉及：`server-connection.ts`  
  - 验收：结构化结果可 JSON 展示

---

## P2-05 参数校验解耦

**背景**：`verifyToolArguments` 硬编码 `executeApi` / `doSqlQuery`，非通用 Agent 能力。

### 任务

- [ ] **P2-05-01** 将业务校验移到 MCP 服务端或 Hook 插件  
  - 涉及：`openai.ts`  
  - 验收：Harness 无业务 API 名硬编码

- [ ] **P2-05-02** 通用校验：JSON Schema validate（zod / ajv）基于 MCP tool inputSchema  
  - 涉及：`tool-executor.ts`  
  - 验收：schema 不匹配时 tool_result 含清晰错误

- [ ] **P2-05-03** `enableParamValidation` 重命名为 `enableSchemaValidation`  
  - 涉及：`feature-config.ts`、settings  
  - 验收：语义准确

---

## P2-06 Plugin Manifest 发现（可选）

**2026 实践**：`.mcp-plugin/plugin.json` 声明 server 启动命令，减少手动配置。

### 任务

- [ ] **P2-06-01** 支持从项目根 `.mcp-client/plugins/` 加载 manifest  
  - 涉及：新建 `src/core/plugin-loader.ts`  
  - 验收：manifest 中 server 自动出现在 settings

- [ ] **P2-06-02** 与现有 DB 配置合并（DB 优先）  
  - 涉及：`config.service.ts`  
  - 验收：不破坏现有 SQLite 配置

---

## P2 完成检查清单

- [ ] info 页展示 tools + resources + prompts
- [ ] 至少一个远程 MCP 服可走 OAuth
- [ ] 连接状态机完整可见
- [ ] 无业务 API 硬编码在 Harness
- [ ] README 更新 MCP 能力面说明
