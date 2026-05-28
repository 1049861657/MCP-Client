# T2 — 配置平面 + 管理员平台（多渠道能力隔离）

> **状态**：未开始  
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

- **管理员平台**（独立路由/UI）：维护各渠道的 **Agent Profile** 与 **Route**；保存后 `configVersion++`，下一条消息生效。
- **Web 聊天页**：仅 `channel=web` 的 **请求级 / 会话级 override**；禁止写全局 `Setting` 或他渠道 Profile。
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
  ← AgentProfile（Route 命中）
  ← envelope.payload.chatOptions（仅当调用方显式传入）
  ← sessionOverride（仅 channel=web + sessionKey，Redis/Setting，TTL 可选）
```

- **禁止**在 `normalize-dingtalk-inbound` 等写 `ToolsConfig.enableMCPTools`。
- **禁止**管理员保存 Web 聊天 localStorage 到全局 Setting。

### 配置热更新

| 变更类型 | 机制 |
|----------|------|
| Profile / Route 增删改 | `ConfigService` 写 DB → `bumpConfigVersion()` → Resolver 内存快照按 version 刷新 |
| MCP 连接定义、Provider API Key | 保存后调用既有 **`reloadMCPConfig` / `reloadAiProviders`**（与 T2 文档化，Admin API 内触发） |

### 管理员平台 vs Web 聊天

| 入口 | 用户 | 改什么 | 影响范围 |
|------|------|--------|----------|
| **`/admin/*`**（新） | 运维/管理员 | Binding、Profile、Route | 对应 channel（及匹配会话） |
| **`/api/chat/stream`** + `ai.html` | 终端用户 | 当前会话 model/tools 等 | **仅** `channel=web` 当次或 session override |
| 旧 **`/api/settings/*`**（聊天相关） | — | 迁到 Admin 或标废弃 | 避免双写 |

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
| 测试 | 持久化单测：Resolver 覆盖链、Route 优先级；E2E 可后置 |

### 配置热更新（运行手册）

| 变更类型 | 操作 | 生效方式 |
|----------|------|----------|
| `AgentProfile` / `RouteRule` 增删改 | Admin API 写 DB 后调用 **`bumpConfigPlaneVersion()`** | 内存快照刷新；**下一条** Inbound 消息用新 Profile |
| `mcpToolPrompt` / `mcpEnabledToolServerIds`（旧 Setting） | 仍写入 Setting；seed 仅空库一次 | 已运行实例应改 Profile 并 bump，勿依赖单独改 Setting |
| MCP 服务器连接（command/url/headers） | `POST /api/server/reload-config` 或 add/update/delete 内建 reload | **`reloadMCPConfig()`** 重连 |
| AI 提供商 / API Key / 默认模型 | `POST /api/settings/providers` + **`POST /api/settings/providers/reload`** | **`reloadAiProviders()`** 重建 `AiProvider` 实例 |
| Web 会话临时选项 | `webOverride:{sessionKey}`（T2-07 API） | 仅 **`channel=web`** 下一条 resolve 合并 |

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
│  snapshot + configVersion                       │
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
  - 验收：单测 ≥4 例（global、channel 默认、群 ID 命中、web body override）  
  - 完成日期：2026-05-28

- [x] **T2-02-02** `src/config-plane/config-snapshot.ts` — 启动加载 + `bumpConfigPlaneVersion()` 刷新；`getConfigPlaneSnapshot()`  
  - 验收：bump 后下一 resolve 读到新 Profile，无需重启进程  
  - 完成日期：2026-05-28

- [x] **T2-02-03** `src/config-plane/session-override.ts` — **仅** `channel=web`：`sessionKey` → `Setting` 键 `webOverride:{sessionKey}`  
  - 验收：钉钉 envelope 不读 session override（单测覆盖）  
  - 完成日期：2026-05-28

---

## T2-03 Inbound 集成

- [x] **T2-03-01** `inbound-worker.ts` — `runHarnessForEnvelope` 内：`resolved = resolveProfile(envelope)`，再 `chatStream(..., resolved 字段)`  
  - 验收：Harness 调用签名与改前行为一致；日志可打 `profileId`  
  - 完成日期：2026-05-28

- [x] **T2-03-02** `ai-provider.ts` — `convertMcpToolsToChatFunctions` / `formatMessages` 接受 **可选** `ResolvedChatProfile`（或从单次请求上下文传入），避免隐式全局 `getMCPConfig` 与 Profile 不一致  
  - 验收：Profile 指定 `mcpServerIds` 时工具列表与启用列表一致  
  - 完成日期：2026-05-28

- [x] **T2-03-03** Provider/MCP reload — Admin 改 Provider 或 MCP server 定义时，API 内调用既有 reload；改 Profile 仅 bump version  
  - 验收：文档化于本文件「配置热更新（运行手册）」表  
  - 完成日期：2026-05-28

---

## T2-04 渠道 normalize 瘦身

- [x] **T2-04-01** `normalize-dingtalk-inbound.ts` / `normalize-feishu-inbound.ts` — 删除 `buildDefaultChatOptions()`；`payload.chatOptions` 为 `{}` 或省略  
  - 验收：单测仍通过；入站 Envelope 不含量化默认  
  - 完成日期：2026-05-28

- [x] **T2-04-02** `normalize-web-inbound.ts` — body 字段仍映射到 `chatOptions`（**请求 override**）；未传字段由 Resolver 从 `web` Profile 补全  
  - 验收：与 T2-02 单测「web body override」一致；`normalize-web-inbound.test.ts`  
  - 完成日期：2026-05-28

---

## T2-05 Admin API

- [x] **T2-05-01** `src/api/admin.controller.ts` + `routes` 挂载 `/api/admin/*` — CRUD Profile、Route；`GET /api/admin/config-version`  
  - 鉴权：`X-Admin-Token` = `ADMIN_API_TOKEN`；无/错 token 401  
  - 验收：curl 可更新 `dingtalk-default` 并 bump version  
  - 完成日期：2026-05-28

- [x] **T2-05-02** `POST /api/admin/profiles/:profileId/apply-test` — mock 上下文返回 `ResolvedChatProfile`  
  - 验收：不改 DB 即可预览解析结果  
  - 完成日期：2026-05-28

- [x] **T2-05-03** 启动 `initConfigPlane` seed + 可选 `POST /api/admin/seed`  
  - 验收：空库首次启动后钉钉/飞书/Web 各有默认 Route  
  - 完成日期：2026-05-28

---

## T2-06 管理员平台 UI（最小）

- [x] **T2-06-01** `public/admin/index.html` + `admin.js` — 列表/编辑 Profile、Route；选择 channel；保存调 Admin API  
  - 验收：浏览器改钉钉 Profile `enableTools=false` 后，下一条钉钉消息不调工具（Web 仍按 web Profile）  
  - 完成日期：2026-05-28

- [x] **T2-06-02** 与聊天站分离 — `ai.html` 不设入口改全局 MCP/Provider；设置页迁移说明或链接到 `/admin`  
  - 验收：README 或页面提示「渠道能力请用管理员平台」  
  - 完成日期：2026-05-28

---

## T2-07 Web 聊天页作用域

- [ ] **T2-07-01** `ai-ui.js` / `ai-api.js` — 会话级设置写入 **session override API**（`POST /api/chat/session-options`），不再 `localStorage` 写 enableTools/model（或 localStorage 仅作草稿，提交才写服务端）  
  - 验收：Web 关工具不影响钉钉；刷新后 override 仍生效（若 session 未变）  

- [ ] **T2-07-02** `normalize-web-inbound` + Resolver — session override 合并进 `ResolvedChatProfile`（优先级低于 body 显式字段）  
  - 验收：单测覆盖 web session override  

---

## T2-08 兼容与清理

- [ ] **T2-08-01** 保留 `POST /api/mcp/servers/enabled` 行为：写入时同步更新 **所有** Profile 的 `mcpServerIds` 或仅 `global-default`（二选一须在 PR 说明；推荐改为只改 Admin，旧 API 标 `@deprecated` 写 `global-default`）  
  - 验收：旧前端调用不崩溃  

- [ ] **T2-08-02** `.env.example` — `ADMIN_API_TOKEN`；文档说明 Admin 与聊天 API 分离  

---

## T2-09 验收

- [ ] **T2-09-01** E2E：Admin 将 `dingtalk-default.enableTools=false` → 钉钉 @ 机器人无 tool call；Web 同 Profile 配置下仍可工具（若 `web-default` 为 true）  
- [ ] **T2-09-02** E2E：Admin 改 `dingtalk-default` model → 下一条钉钉用新模型；**无需**改 Web 聊天页  
- [ ] **T2-09-03** 更新 [ROADMAP.md](./ROADMAP.md) 架构图（Config Plane 块）与 [README.md](./README.md) 进度表  

---

## 完成检查

- [ ] 各渠道能力由 **Profile + Route** 决定，normalize 无 `ToolsConfig` 写死  
- [ ] 管理员平台可独立配置钉钉/飞书/Web，互不影响  
- [ ] Web 聊天页改动作用域 ≤ `channel=web`  
- [ ] Inbound Worker 单一解析点 `resolveProfile`  
- [ ] Harness 无 `channel` 分支（与 T1 一致）  

---

## PR 建议

| PR | 内容 |
|----|------|
| PR-1 | T2-01 + T2-02 + T2-03 + T2-04（Resolver 贯通 + 渠道瘦身） |
| PR-2 | T2-05 + T2-08（Admin API + 迁移） |
| PR-3 | T2-06 + T2-07 + T2-09（Admin UI + Web 作用域 + E2E） |

## 新建目录预期

```
src/config-plane/       profile-resolver, config-snapshot, session-override
src/api/admin.controller.ts
src/types/config-plane.types.ts
public/admin/             index.html, admin.js
prisma/                   AgentProfile, RouteRule migrations
```

---

## 与 P1 关系

- T2 与 P1（压缩/恢复/权限）**可并行**；P1 改 Harness 语义时，Resolver 输出字段保持稳定即可。
- P1-03 权限门落地后，可在 `ResolvedChatProfile` 增 `permissionPolicyId`（T2 不阻塞）。
