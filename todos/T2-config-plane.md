# T2 — 配置平面 + 管理员平台（多渠道能力隔离）

> **状态**：**已验收**（2026-06-03；含 T2-09 E2E 与完成检查清单）  
> **范围**：在 T1 渠道 + Bus 之上增加 **Config Plane**；**独立管理员平台**按渠道配置能力；Web 聊天页改动**不污染**钉钉/飞书  
> **前置**：T1 已交付（Envelope → Inbound Worker → Harness）；现有 `Setting` / `AIProvider` / `MCPServer` 可迁移  
> **预估**：**18** 子项（约 **2–3 人日**，分 3 PR）  
> **参考**：[OpenClaw channels 配置](https://docs.openclaw.ai/gateway/configuration) · [LangBot Pipeline/Bot](https://docs.langbot.app/en/usage/pipelines/readme) · 本仓库 T1 [T1-channel-bus.md](./T1-channel-bus.md)

---

## 现状 → 目标

**现网**

- 钉钉/飞书 `normalize-*` 写死 `ToolsConfig`；Web body 可覆盖部分字段。
- 设置页改 `defaultProvider`、`mcpEnabledToolServerIds` → **全渠道**下一请求生效（Provider 需 reload）。
- Web 聊天页 `localStorage`（`aiChatSettings`）→ **仅本浏览器**，且与 IM 渠道配置模型不一致。

**目标**

```
IM/Web 入站 → Envelope（无写死 chatOptions）
       → Inbound Worker → resolveProfile(envelope) → ResolvedChatProfile
       → AiProvider.chatStream（只读 resolved）
```

- **管理员平台**（独立路由/UI）：维护各渠道的 **Agent Profile** 与 **Route**；保存后 **`reloadConfigPlaneSnapshot()`**，下一条消息生效。
- **Web 聊天页**：**浏览器全局**一份 model/tools 等（所有 Web 会话共用）；每次请求可通过 **body `chatOptions`** 覆盖；**禁止**写 IM Profile、禁止写 Provider/MCP 全局 Setting。
- **Harness / agent-loop / MCP 调用语义不变**；动的是配置来源与解析点。

---

## 设计定稿（唯一方案）

### 三实体

| 实体 | 职责 | 存储 |
|------|------|------|
| **ChannelBinding** | 渠道连接与入站策略：凭证引用、@ 策略、enabled | DB；密钥仍 `.env` / Secret，Binding 只存 key 名 |
| **AgentProfile** | 能力档案：`profileId`、vendor、model、temperature、maxTokens、enableTools、enablePrompts、enableParamValidation、maxToolCallRounds、enableAutoCompact、compactModel、`mcpServerIds[]`、`toolPrompt` | DB 表 `AgentProfile` |
| **RouteRule** | 路由：`channel` + 可选 `match`（`conversationId` / `chatId` 精确或 `*`）→ `profileId`；**有序**，先匹配先生效 | DB 表 `RouteRule` |

### 覆盖链（Resolver 唯一算法）

```
ResolvedChatProfile =
  codeDefaults (feature-config 兜底)
  ← AgentProfile（Route 命中，含 web-default）
  ← envelope.payload.chatOptions（Web 请求体显式字段；IM 通常为空）
```

- **禁止**在 `normalize-dingtalk-inbound` 等写 `ToolsConfig.enableMCPTools`。
- **禁止** Web 聊天设置写入 **按 sessionId 分键** 的服务端 override（如 `webOverride:{sessionKey}`）。
- **Web 用户偏好**（model、enableTools 等）由 **前端全局 state + localStorage 单键** 维护，经 **每请求 body** 进入 Resolver；**不**增加 Config Plane 会话级存储层。

### 配置热更新

| 变更类型 | 机制 |
|----------|------|
| Profile / Route 增删改 | `ConfigService` 写 DB → **`reloadConfigPlaneSnapshot()`** → Resolver 内存快照刷新 |
| MCP 连接定义、Provider API Key | 保存后调用既有 **`reloadMCPConfig` / `reloadAiProviders`**（与 T2 文档化，Admin API 内触发） |

### 管理员平台 vs Web 聊天

| 入口 | 用户 | 改什么 | 影响范围 |
|------|------|--------|----------|
| **`/admin/*`**（新） | 运维/管理员 | Profile、Route | 对应 channel（钉钉/飞书；Web 默认 `web-default` 可选） |
| **`/api/chat/stream`** + `ai.html` | 终端用户 | Web **全局** model/tools 等 + 当次 body | **仅** `channel=web`；与 IM Profile **隔离** |
| **`/api/settings/*`** | 运维 | Provider、MCP 连接定义 | 基础设施；**不**承载 Web 聊天 model/tools 偏好 |

---

## 约束

| 项 | 决策 |
|----|------|
| 租户 | T2 **不做** multi-tenant；表结构 `tenantId` 可 nullable 预留 |
| Envelope | `payload.chatOptions` 保持 optional；IM 入站默认 **空对象** |
| 默认 Profile | 必须存在 `global-default`；每 channel 至少一条 Route：`channel → * → {channel}-default` |
| 迁移 | 首次启动或 migration：从现有 `defaultProvider`、`mcpEnabledToolServerIds`、`mcpToolPrompt` 生成 `web-default` / `dingtalk-default` / `feishu-default` |
| 安全 | Admin API **独立鉴权**（env `ADMIN_API_TOKEN` 或最小 Basic）；与公开 `chat/stream` 分离 |
| 前端 | Admin 可用极简静态页（`public/admin/`）；**不要求**改 `ai-api.js` 帧格式 |
| 测试 | E2E / 手工验收；**不维护**单元测试文件 |

### 配置热更新（运行手册）

| 变更类型 | 操作 | 生效方式 |
|----------|------|----------|
| `AgentProfile` / `RouteRule` 增删改 | Admin API 写 DB 后调用 **`reloadConfigPlaneSnapshot()`** | 内存快照刷新；**下一条** Inbound 消息用新 Profile |
| `mcpToolPrompt` / `mcpEnabledToolServerIds`（旧 Setting） | **仅空库 seed 读一次**；运行态禁止读写 | 日常改 MCP 启用范围：Web → localStorage+body；IM → Admin Profile |
| MCP 服务器连接（command/url/headers） | `POST /api/server/reload-config` 或 add/update/delete 内建 reload | **`reloadMCPConfig()`** 重连 |
| AI 提供商 / API Key / 默认模型 | `POST /api/settings/providers` + **`POST /api/settings/providers/reload`** | **`reloadAiProviders()`** 重建 `AiProvider` 实例 |
| Web 聊天全局偏好 | `ai.html` 设置面板 → `localStorage` 单键（如 `aiChatSettings`）→ 加载到 `app.state` → 每请求 body | **仅 Web 前端**；不入 Setting、不 bump Profile；Resolver 经 body 合并 |

---

## 目标架构

```
┌──────────────── Admin UI (/admin) ────────────────┐
│  CRUD Profile · Route · ChannelBinding            │
└────────────────────┬────────────────────────────┘
                     │ REST /api/admin/*
┌────────────────────▼────────────────────────────┐
│  Config Plane (src/config-plane/)               │
│  resolveProfile(envelope) → ResolvedChatProfile │
│  snapshot（内存，Admin 保存后 reload）            │
└────────────────────┬────────────────────────────┘
                     │
Channels → Bus → inbound-worker ──► AiProvider (resolved only)
```

---

## 开发顺序

`T2-01 → T2-02 → T2-03 → T2-04`（核心路径）→ `T2-05 → T2-06`（Admin）→ `T2-07 → T2-08 → T2-09`

---

## T2-01 数据模型与契约

- [x] **T2-01-01** `prisma/schema.prisma` — 表 `AgentProfile`、`RouteRule`（`ChannelBinding` 用 Setting `channelBindings` 占位）  
  - 验收：`prisma migrate` 通过；字段与下表一致  
  - 完成日期：2026-05-28

- [x] **T2-01-02** `src/types/config-plane.types.ts` — `ResolvedChatProfile`、`AgentProfileRecord`、`RouteRuleRecord`；与现有 `ChatOptions` 对齐  
  - 验收：无 `any`；可供 Worker / Admin API 共用  
  - 完成日期：2026-05-28

- [x] **T2-01-03** `src/config/feature-config.ts` — 仅作 **Resolver 兜底**；注释标明「运行时以 Profile 为准」  
  - 验收：T2-01 仅文档化兜底；渠道 normalize 瘦身见 T2-04  
  - 完成日期：2026-05-28

**AgentProfile 最小字段**：`profileId`(unique)、`displayName`、`vendor?`、`defaultModel`、`temperature?`、`maxTokens?`、`enableTools`、`enablePrompts`、`enableParamValidation`、`maxToolCallRounds`、`enableAutoCompact?`、`compactModel?`、`mcpServerIds`(Json string[])、`toolPrompt?`、`updatedAt`  

**RouteRule 最小字段**：`id`、`channel`(web|feishu|dingtalk)、`matchKey`(`*` 或 conversationId/chatId)、`profileId`、`priority`(int，越小越优先)、`enabled`  

---

## T2-02 Config Resolver

- [x] **T2-02-01** `src/config-plane/profile-resolver.ts` — `resolveProfile(envelope): ResolvedChatProfile`  
  - 实现覆盖链；Route 按 `priority` + 精确 match 优于 `*`  
  - 验收：覆盖链覆盖 global、channel 默认、群 ID 命中、web body override（代码审查 / E2E）
  - 完成日期：2026-05-28

- [x] **T2-02-02** `src/config-plane/config-snapshot.ts` — 启动加载 + **`reloadConfigPlaneSnapshot()`** 刷新；`getConfigPlaneSnapshot()`  
  - 验收：reload 后下一 resolve 读到新 Profile，无需重启进程  
  - 完成日期：2026-05-28

- [x] **T2-02-03** Resolver 覆盖链 — **仅** Profile + envelope `chatOptions`（**无** 会话级中间层）  
  - 验收：钉钉 envelope 不读 Web localStorage；Web body 显式字段覆盖 Profile  
  - 完成日期：2026-05-28  
  - > **修订**：曾短暂实现 `session-override` / `webOverride:*`，已认定过度设计；**T2-07 重构**拆除，以本节两层链为准。

---

## T2-03 Inbound 集成

- [x] **T2-03-01** `inbound-worker.ts` — `runHarnessForEnvelope` 内：`resolved = resolveProfile(envelope)`，再 `chatStream(..., resolved 字段)`  
  - 验收：Harness 调用签名与改前行为一致；日志可打 `profileId`  
  - 完成日期：2026-05-28

- [x] **T2-03-02** `ai-provider.ts` — `convertMcpToolsToChatFunctions` / `formatMessages` 接受 **可选** `ResolvedChatProfile`（或从单次请求上下文传入），避免隐式全局 `getMCPConfig` 与 Profile 不一致  
  - 验收：Profile 指定 `mcpServerIds` 时工具列表与启用列表一致  
  - 完成日期：2026-05-28

- [x] **T2-03-03** Provider/MCP reload — Admin 改 Provider 或 MCP server 定义时，API 内调用既有 reload；改 Profile 后 **reload 快照**  
  - 验收：文档化于本文件「配置热更新（运行手册）」表  
  - 完成日期：2026-05-28

---

## T2-04 渠道 normalize 瘦身

- [x] **T2-04-01** `normalize-dingtalk-inbound.ts` / `normalize-feishu-inbound.ts` — 删除 `buildDefaultChatOptions()`；`payload.chatOptions` 为 `{}` 或省略  
  - 验收：入站 Envelope 不含量化默认  
  - 完成日期：2026-05-28

- [x] **T2-04-02** `normalize-web-inbound.ts` — body 字段仍映射到 `chatOptions`（**请求 override**）；未传字段由 Resolver 从 `web` Profile 补全  
  - 验收：body 字段正确映射到 `chatOptions`；未传字段由 Resolver 从 `web` Profile 补全  
  - 完成日期：2026-05-28

---

## T2-05 Admin API

- [x] **T2-05-01** `src/api/admin.controller.ts` + `routes` 挂载 `/api/admin/*` — CRUD Profile、Route  
  - 鉴权：`X-Admin-Token` = `ADMIN_API_TOKEN`；无/错 token 401  
  - 验收：curl 可更新 `dingtalk-default` 并 reload 内存快照  
  - 完成日期：2026-05-28

- [x] **T2-05-02** `POST /api/admin/profiles/:profileId/apply-test` — mock 上下文返回 `ResolvedChatProfile`  
  - 验收：不改 DB 即可预览解析结果  
  - 完成日期：2026-05-28

- [x] **T2-05-03** 启动 `initConfigPlane` seed + 可选 `POST /api/admin/seed`  
  - 验收：空库首次启动后钉钉/飞书/Web 各有默认 Route  
  - 完成日期：2026-05-28

---

## T2-06 管理员平台 UI（最小）

- [x] **T2-06-01** `frontend/admin/`（Vite）→ `public/admin/` — 列表/编辑 Profile、Route；选择 channel；保存调 Admin API  
  - 验收：浏览器改钉钉 Profile `enableTools=false` 后，下一条钉钉消息不调工具（Web 仍按 web Profile）  
  - 完成日期：2026-05-28

- [x] **T2-06-02** 与聊天站分离 — `ai.html` 不设入口改全局 MCP/Provider；设置页迁移说明或链接到 `/admin`  
  - 验收：README 或页面提示「渠道能力请用管理员平台」  
  - 完成日期：2026-05-28

---

## T2-07 Web 聊天页作用域

> **2026-05-28 任务书重构**  
> Web 端 model/tools/temperature 等为 **浏览器全局一份**，所有 Web 聊天会话共用；**不是** 每个 sessionId 一套设置。  
> 与 IM 隔离：Web 只影响 `channel=web` 入站（`web-default` + body），钉钉/飞书只读各自 Profile。  
> **撤销** 原方案：`POST /api/chat/session-options`、`webOverride:{sessionKey}`、Resolver `sessionOverride` 层。

- [x] **T2-07-01** `ai-ui.js` / `ai-api.js` — Web 设置 **全局** 持久化：`localStorage` **单键**（如 `aiChatSettings`），启动/保存时加载到 `app.state`；切换或新建会话 **不** 按 sessionId 拉不同配置；移除对 `/api/chat/session-options` 的调用  
  - 验收：在会话 A 改「关工具」后新建会话 B，仍为关工具；刷新页面后仍生效；钉钉/飞书行为不变  
  - 完成日期：2026-05-28

- [x] **T2-07-02** 拆除误加的 session override — 删除 `session-override.ts`、`GET/POST /api/chat/session-options`、Resolver 中 `sessionOverride` 合并、`ProfileResolveContext.sessionOverride`；删除 `webOverride:*` 相关类型常量；覆盖链收敛为 **Profile + body** 两层  
  - 验收：`resolveProfile` 覆盖链无 session 层；`pnpm exec tsc --noEmit` 通过  
  - 完成日期：2026-05-28

- [x] **T2-07-03** `normalize-web-inbound` — body 仍映射 **当次** `chatOptions`；`sessionKey` 回退为 **`web:{requestId}`**（移除仅为 override 引入的 body.sessionId）  
  - 验收：body 仍映射 **当次** `chatOptions`；`sessionKey` 为 **`web:{requestId}`**；现网 Web 多轮行为一致（手工验证）  
  - 完成日期：2026-05-28

---

## T2-08 旧路径淘汰与文档

> **2026-05-28 决策**：不做旧 API 兼容层；`mcpEnabledToolServerIds` 与 `POST /api/mcp/servers/enabled` 淘汰。  
> Web MCP 勾选 → **localStorage + 每请求 body `mcpServerIds`**；IM → **Admin Profile**。

- [x] **T2-08-01** 删除 `POST /api/mcp/servers/enabled` 及 `AiController.updateEnabledServers`；`GET /api/mcp/servers` 不再读 Setting 返回全局 `enabledServerIds`；`ConfigService.getMCPConfig` 运行态不再返回 `enabledToolServerIds`（seed 仍可读 Setting 一次）  
  - Web：`ai-*.js` 去掉 `saveEnabledMCPServers`；`enabledServerIds` 纳入 `aiChatSettings`；请求 body 带 `mcpServerIds`  
  - `normalize-web-inbound` + `ChatOptions` + Resolver `mergeLayer` 支持 body `mcpServerIds`  
  - `info.html` 去掉对 enabled POST 的调用  
  - 验收：`pnpm exec tsc --noEmit` 通过；旧 POST 404；Web 勾选 MCP 刷新后仍生效（localStorage）  
  - 完成日期：2026-05-28

- [x] **T2-08-02** `.env.example` + `README.md` — `ADMIN_API_TOKEN`；Admin API 与 `/api/chat/*` 分离；MCP 能力配置入口说明  
  - 验收：文档可读，无「全局 Setting 启 MCP」误导  
  - 完成日期：2026-05-28

---

## T2-09 验收

- [x] **T2-09-01** E2E：Admin 将 `dingtalk-default.enableTools=false` → 钉钉 @ 机器人无 tool call；Web 同 Profile 配置下仍可工具（若 `web-default` 为 true）  
  - 完成日期：2026-06-03

- [x] **T2-09-02** E2E：Admin 改 `dingtalk-default` model → 下一条钉钉用新模型；**无需**改 Web 聊天页  
  - 完成日期：2026-06-03

- [x] **T2-09-03** 更新 [ROADMAP.md](./ROADMAP.md) 架构图（Config Plane 块）与 [README.md](./README.md) 进度表  
  - 完成日期：2026-06-03

---

## 完成检查

- [x] 各渠道能力由 **Profile + Route** 决定，normalize 无 `ToolsConfig` 写死  
- [x] 管理员平台可独立配置钉钉/飞书/Web，互不影响  
- [x] Web 聊天偏好为 **浏览器全局**（非 per-session 服务端存储），作用域 ≤ `channel=web`（经 body 进 Resolver）  
- [x] Inbound Worker 单一解析点 `resolveProfile`  
- [x] Harness 无 `channel` 分支（与 T1 一致）  

---

## PR 建议

| PR | 内容 |
|----|------|
| PR-1 | T2-01 + T2-02 + T2-03 + T2-04（Resolver 贯通 + 渠道瘦身） |
| PR-2 | T2-05 + T2-08（Admin API + 迁移） |
| PR-3 | T2-06 + T2-07（重构）+ T2-09（Admin UI + Web 全局偏好 + E2E） |

## 新建目录预期

```
src/config-plane/       profile-resolver, config-snapshot（无 session-override）
src/api/admin.controller.ts
src/types/config-plane.types.ts
public/admin.html             Vite 构建产物（源码 frontend/src/admin/、frontend/admin.html）
frontend/src/chat/            Web 全局 aiChatSettings + body chatOptions
prisma/                   AgentProfile, RouteRule migrations
```

---

## 与 P1 关系

- T2 与 P1（压缩/恢复/权限）**可并行**；P1 改 Harness 语义时，Resolver 输出字段保持稳定即可。
- P1-03 权限门落地后，可在 `ResolvedChatProfile` 增 `permissionPolicyId`（T2 不阻塞）。
