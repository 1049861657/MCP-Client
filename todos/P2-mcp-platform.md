# P2 — MCP 平台化

> **目标**：从 tools-first 升级为 MCP 2025–2026 完整客户端能力面，对齐 OAuth、Resources、Prompts、连接治理。  
> **前置**：P0 完成；P1-03 权限门完成（OAuth 需 ask 管道）  
> **预估**：2 周  
> **参考索引**：[REFERENCES.md](./REFERENCES.md)

---

## P2-01 Client Capabilities 与握手

**背景**：`MCPClientIdentity.capabilities = {}` 空对象，未声明 sampling/roots/elicitation 等。

### 任务

- [ ] **P2-01-01** 调研 MCP SDK `@modelcontextprotocol/sdk` 1.29 支持的 client capabilities  
  - 涉及：`src/config/app.config.ts`  
  - 验收：文档记录本项目实际启用的 capabilities

- [ ] **P2-01-02** 按需声明 capabilities（初期：`roots` 可选、`elicitation` 若 UI 支持）  
  - 涉及：`app.config.ts`、`server-connection.ts`  
  - 验收：握手日志可见 capabilities 对象

- [ ] **P2-01-03** 实现 sampling 回调骨架（若服务端请求 LLM 采样）  
  - 涉及：新建 `src/core/mcp-sampling-handler.ts`  
  - 验收：echo 测试服或文档 mock 可验证

---

## P2-02 Resources & Prompts 一等公民

**背景**：README 仅提 tools；`feature-config` 有 `enablePrompts` 但指 system prompt 非 MCP Prompts。

### 任务

- [ ] **P2-02-01** `ServerConnection` 新增 `listResources()` / `readResource(uri)`  
  - 涉及：`src/core/server-connection.ts`  
  - 验收：info 页展示资源列表

- [ ] **P2-02-02** `ServerConnection` 新增 `listPrompts()` / `getPrompt(name, args)`  
  - 涉及：`server-connection.ts`  
  - 验收：可将 MCP Prompt 注入会话

- [ ] **P2-02-03** `MCPClientManager` 聚合多服 resources/prompts  
  - 涉及：`src/core/client.ts`  
  - 验收：API `/api/info` 返回完整能力面

- [ ] **P2-02-04** Harness 支持 `@resource` 引用语法或工具 `fetch_mcp_resource`  
  - 涉及：`agent-harness/`、`prompt-pipeline.ts`  
  - 验收：用户可在聊天中引用 MCP 资源内容

- [ ] **P2-02-05** UI：`info.html` 增加 Resources / Prompts 标签页  
  - 涉及：`public/info.html`、`info.controller.ts`  
  - 验收：可浏览、可复制 URI / prompt 名

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
