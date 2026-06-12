# T4 — 用户账号 + Web 会话持久化

> **状态**：进行中（T4-01~07 完成，T4-08 二期搁置）  
> **范围**：Web **用户名+密码**登录、Admin **登录鉴权**（替代 `ADMIN_API_TOKEN`）、**已登录**会话服务端持久化（服务端组上下文 + 轮末落库）；**未登录**保持现有本地聊天  
> **前置**：T1 Web 入站、T3 聊天页 ESM、P0 完整 message graph  
> **预估**：28 子项  
> **参考**：OWASP Password Storage（Argon2id）、AI SDK Message Persistence（onFinish + consumeStream）、session-as-resource（append-only、服务端 ID）；[s11 Error Recovery](https://learn.shareai.run/zh/s11/)（checkpoint/断流续传 二期）  
> **T4-06 per-user 配置参考**（2026-06 调研 6 家）：**LibreChat #12354** DB-backed per-principal override（base+override deep-merge、数组替换、TTL+空结果缓存+DB故障回退base）、**ABP** SettingProvider 链（Default→Global→Tenant→User，miss 逐级 fallback）、**Open WebUI** Admin baseline + User 个人覆盖、**Dify** ProviderManager 4 级 resolve + ProviderCredentialsCache、**n8n** Cipher（env master key + AES-256-GCM 凭据静态加密——一期 demo **搁置**，见 T4-08-03）；**GitLab** cascading 现版改「写时向子级传播」——本项目**刻意不采用**（会破坏「seed 更新自动传播到未覆盖账号」且引入异步 worker，违反高精简），仅留作反例  
> **冲突排查**：已完成全仓审计（messages[] 消费链、session_ 前缀假设、压缩基线、Abort 生命周期、写接口鉴权），结论已折入各子项

---

## 现状 → 目标

**现网**

- 聊天历史仅存浏览器 **IndexedDB**；`sessionId` 前端生成 `session_*`；**未登录**可用。
- 每次请求 body 带 **`messages[]`**；后端无会话表。
- Admin：`X-Admin-Token` = `ADMIN_API_TOKEN`；聊天 API **无**登录。

**目标**

```
未登录 → 与现网相同：IndexedDB 本地存、body messages[]、/api/chat/* 匿名可用
已登录 → 请求只带 sessionId + 新消息；服务端组上下文、轮末落库（SSOT）
         换设备可拉历史；Admin/配置 登录即可操作
```

## 架构原则（四高）

| 原则 | 落点 |
|------|------|
| **高性能** | 已登录不再全量 `messages[]` 上行（省带宽/序列化）；`ChatMessage` 走 `(sessionId, createdAt)` 索引单查询组上下文；轮末**单事务批量** append；历史 API 分页 |
| **高可用** | 持久化与 HTTP 生命周期**解耦**：客户端断流/Abort 不丢已产出轮次；`SessionEnd` 钩子 `finally` 保护；落库幂等（消息 ID 服务端生成，重试不重写） |
| **高拓展** | 存储经 `ChatStore` 服务层收口（未来换 PG / 加 Redis 热层不动调用方）；前端 guest/authed 经统一 `session-store` 抽象（未来加 OIDC 只换 auth 模块）；二期断流续传/checkpoint 的地基（生成与响应解耦）一期就打好 |
| **高精简** | 本期**不引** Redis/JWT/细粒度 RBAC/邮箱体系（仅两级角色门控用户管理）；IM 渠道不入 User 表；SQLite 单机够用；guest 路径零改动复用现网代码 |

### 存储与鉴权决策（已拍板）

1. **非双写**：未登录只写 IDB，已登录只写服务端；同一条消息绝不两边写。
2. **guest / authed 完全隔离**（ChatGPT 同款）：登录不导入、不合并、不展示 IDB 会话；IDB 原地保留，登出后继续可用。
3. **Cookie 会话**：HttpOnly + Secure + SameSite=Lax，服务端 opaque session（即时吊销）；浏览器端不出现 JWT。
4. **配置归属矩阵（三层）**：  
   - **服务端 null 基线**（`userId=null` 行）：配置平面启动补齐 + `POST /api/admin/seed`；**不经 UI 直改**；作 nil 继承 fallback  
   - **默认体验账号**（**T4-07**）：guest / 无绑定 IM 跟随 `seedFollowUserId`（**超管在用户管理页手动指定**，代码不写初值）；未配置 → `userId=null` 行  
   - **per-user 覆盖层**（每个账号互不共享，**override 非 fork**）：tool-prompt、AI 供应商、MCP、AgentProfile/RouteRule 按 `userId` 覆盖；无用户行 = 继承 null 基线  
   - **浏览器本地**：快捷消息（服务端默认值仅作首次种子）、聊天偏好 `aiChatSettings`、MCP 勾选——guest/authed 同行为
5. **Memory 按身份隔离 + guest 关闭**：bankId `mcp-client-{channel}-{hash12}`（hash = `scopeKey` + 工作区路径）；Web authed=`web:{userId}`，IM=`feishu:{chatId}` / `dingtalk:{conversationId}(:{robotCode})`，guest 关闭 recall/retain；`document_id`=hash(sessionId)，旧链不迁移（见 **T4-06-06** IM 记忆仍按会话、不按绑定账号）。

| 做 | 不做 |
|----|------|
| `User.username` + `passwordHash`（**Argon2id**） | 邮箱登录、OIDC、细粒度 RBAC |
| 两级角色：首账号 SUPERADMIN、后续 USER；**配置修改不分角色**（各改各的覆盖层） | 角色表、按路由授权（角色仅门控用户管理） |
| 废弃 `ADMIN_API_TOKEN`；Admin 改 Cookie 会话 | 双 Token 并存、浏览器存 JWT |
| 已登录：服务端组上下文 + 轮末落库 | 前端上传消息、同会话 IDB+DB 双写 |
| guest / authed 数据完全隔离 | 强制登录才能聊天、IDB 导入/合并 |
| 配置 override：每账号覆盖层 + seed 回退 | 账号之间共享配置 |
| guest 默认配置跟随指定账号（T4-07，超管在用户管理配置） | 直接 UI 改 `userId=null` seed 行 |
| 注册开放；超管可在用户管理中调整角色 | 注册闸门/邀请制 |
| `localStorage` 聊天偏好保留 | 飞书/钉钉并入 User（本期仅 Web）、Redis 热层 |

### 轮子选型（已采纳）

> 依赖由使用方自行加入 `package.json` 安装（pnpm），任务实施时**不执行**安装步骤。

| 依赖 | 用在 | 说明 |
|------|------|------|
| `better-auth`（+ `@better-auth/prisma-adapter`，插件 `username`、`admin`） | T4-01/02 全组 | 2026 Node 自托管鉴权事实标准（Lucia 弃坑、Auth.js 已并入）；DB 会话 + 签名 HttpOnly Cookie + CSRF + 滚动续期 + 限流内置；Express `toNodeHandler` 挂载；Prisma SQLite 一等支持，CLI 生成 schema |
| **Node 原生 `crypto.argon2`**（v24.7+，零依赖） | T4-02-01 | 以自定义 hasher 注入 better-auth；需自写 ~40 行 PHC 封装（拼 `$argon2id$...` + `timingSafeEqual` 验证）；`@node-rs/argon2` 已停更近 2 年、生态正收敛到原生（node-argon2 #469），**不引** |
| `lru-cache` | T4-06-02 | 配置解析结果按 userId 的 TTL 缓存（含**空结果缓存**：无 override 账号缓存「→seed」结果免每请求查库，LibreChat #12354 同款），不自研 |
| `resumable-stream` | T4-08-02（**二期才引**） | Vercel 官方断流续传，AI SDK 续传示例同款 |

明确**不引**：设置分层框架（自研两层 override ~100 行更省）、SuperTokens/Logto/Keycloak（独立 IdP 对单机过重）、Temporal（checkpoint 用不上工作流引擎）；消息 ID 用 Prisma 内置 `cuid()`，零新增依赖。

---

## T4-01 数据模型

- [x] **T4-01-01** Prisma：鉴权表（better-auth 生成）+ `ChatSession`、`ChatMessage` + `ChatStore` 服务层（评审拍板：`chat-store.service.ts` 推迟到 T4-03 首个调用方出现时建）  
  - **鉴权表**（`User`/`Session`/`Account` 等）：由 `npx @better-auth/cli generate` 按插件配置生成——`username` 插件提供用户名登录字段，`admin` 插件自动加 `role` 字段（配 `adminRoles: ['SUPERADMIN']`，普通账号 `USER`）；**不再自建 `AuthSession` 表**（better-auth Session 即 opaque DB 会话，支持吊销/滚动续期）  
  - `ChatSession`（自建）：`userId`（关联 better-auth User）、`title?`、`compactBaselineJson?`（压缩基线随会话存服务端）、`createdAt`、`updatedAt`  
  - `ChatMessage`（自建）：`id`（**服务端生成**，Prisma `cuid()`）、`sessionId`、`role`、`content?`、`toolCallsJson?`、`reasoning?`、`createdAt`；索引 `(sessionId, createdAt)`；**append-only**——写入后不更新不删除，重试产生新消息  
  - 所有聊天读写经 `src/services/chat-store.service.ts` 收口（拓展点：换库/加缓存不动调用方）  
  - 命名注意：better-auth `Session`（登录态）≠ `ChatSession`（聊天会话）≠ Bus `sessionKey`（分区键），代码注释明示三者职责  
  - 涉及：`prisma/schema.prisma`、migration、`src/lib/auth.ts`（betterAuth 实例 + prismaAdapter）  
  - 验收：migration 成功；better-auth 表与业务表共存于同一 SQLite

---

## T4-02 账号与鉴权

- [x] **T4-02-01** better-auth 集成：注册/登录/登出/me/改密码  
  - **账号模型（评审拍板 2026-06-10）**：username 插件的注册端点 `POST /sign-up/email` 强制 `email`+`name`+`password`，username 仅附加登录字段；故**纳入 email 为正式字段**——注册收集 `email`+`username`+`password`（`name` 取 username），登录走 `signIn.username`（用户名+密码）。email 不做验证（`requireEmailVerification` 关、`autoSignIn` 开），仅满足库约束与唯一性  
  - Express 挂载：`app.all('/api/auth/*splat', toNodeHandler(auth))`（Express 5 命名通配）——注册/登录/登出/get-session/change-password/会话吊销均为库内置端点，**不自研 controller**；**挂载点是 `src/app.ts`**（须在 `express.json()` 之前，而 `express.json()` 在 app.ts）  
  - 密码哈希：自定义 hasher 注入 **Node 原生 `crypto.argon2`**（v24.7+/OpenSSL 3.2+，本机 v24.16 已验证 `argon2Sync('argon2id',{...})` 返回 32B 裸 tag）；新建 `src/lib/password-hasher.ts`：`hash` 生成 `$argon2id$v=19$m=19456,t=2,p=1$salt$hash`（OWASP 基线），`verify` 解析参数重算 + `timingSafeEqual` 比较  
  - 会话固定防护、登录失败统一报错、**滚动续期**、登出即时吊销、登录限流：better-auth 内置，验收时核对即可  
  - **角色分配**：注册保持开放；`databaseHooks.user.create.before` 里实现「首个账号自动 `SUPERADMIN`，后续一律 `USER`」（LibreChat 同款，按 `prisma.user.count()` 判定）；角色**不**限制配置修改（per-user override 下各改各的），仅门控用户管理（T4-02-05）  
  - 改密码成功后吊销该用户其他会话（better-auth `revokeOtherSessions` 选项）  
  - 涉及：`src/lib/auth.ts`、`src/lib/password-hasher.ts`（新增）、`src/app.ts`（挂载顺序）；`.env.example` 加 `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`  
  - 验收：可注册登录；错密 401；session 含 role；登出后旧 Cookie 立即失效；第二个注册账号 role=USER

- [x] **T4-02-02** 鉴权中间件 + Cookie 安全基线 + 写接口收口  
  - Cookie 安全（HttpOnly/Secure 前缀/SameSite）与 **CSRF 防护** 由 better-auth 提供；业务中间件 `src/api/user-auth.ts` 用 `auth.api.getSession({ headers })` 校验并注入 `req.user`  
  - 需登录：`/api/sessions/*`、`/api/admin/*`、**所有配置写操作**（`POST /api/settings/*`、`/api/server/add|update|delete|connect|switch|disconnect`、`PUT .../tool-preferences`、`POST .../tools/call`、`POST /api/server/reload-config` 等）；登录后写操作**只作用于当前用户自己的配置**（见 T4-06）  
  - **删除** `POST /api/config/quick-messages/save`（快捷消息本地化后无服务端写路径，见 T4-02-04）  
  - 保持匿名：`/api/chat/*`、全部 GET 读接口（与现网一致；已登录时附带 Cookie，后端据此分流 guest/authed）  
  - **删除** `assertAdminAuth` / `ADMIN_API_TOKEN` / `X-Admin-Token`  
  - 涉及：`src/api/user-auth.ts`、`routes.ts`；`.env.example` 移除 `ADMIN_API_TOKEN`  
  - 验收：无 Session 可调 chat 与所有 GET；写接口/admin 401；跨站 Origin 写请求被拒

- [x] **T4-02-03** 前端登录态：聊天页 **可选** 登录；Admin **必须** 登录  
  - Admin：`frontend/src/admin/app.js` 去掉 Token 输入与 `mcp-admin-token` localStorage，改 `credentials: 'include'`；`admin.html` Token 框换登录 UI  
  - 聊天：顶栏/设置区登录入口；未登录不拦截发消息；**guest 服务端配置进只读态**（tool-prompt 等设置项可看不可存，隐藏保存入口 `core.js:1151`），读不受限  
  - 涉及：`frontend/src/auth/`（chat/admin 共用）、`core.js`  
  - 验收：未登录可聊天（IDB）、配置只读（看到的是服务端默认 seed）；未登录进 Admin 提示登录；登录后编辑的是自己那套

- [x] **T4-02-04** 快捷消息 **本地化**（种子化 + 本地自治）  
  - 首次访问 `GET /api/config/quick-messages` 拉服务端默认值 → 写入 `localStorage` → 之后增删改全在本地，guest/authed 同行为  
  - 删除前端 `POST .../save` 调用（`quickmessage.js:739`）与后端写端点；`QuickMessage` 表降级为默认值种子（与其余 seed 一致：**仅 seed 脚本维护，不经 UI**）  
  - 本期不做 authed 跨设备同步（如需，后续加 per-user 存储）  
  - 涉及：`frontend/src/chat/ui/quickmessage.js`、`storage-contract.js`（新增本地键契约）、`config.controller.ts`、`routes.ts`  
  - 验收：改快捷消息只影响当前浏览器；清空 localStorage 后回到服务端种子默认值

- [x] **T4-02-05** 用户管理（仅 SUPERADMIN）：实现采用自建 `users.controller.ts`（prisma + 复用 argon2 hasher），可靠落地「最后超管/自降」保护，未走 admin 插件端点  
  - 列表/改角色/重置密码直接用插件能力：`admin.listUsers`、`admin.setRole`（SUPERADMIN ⇄ USER）、`admin.setUserPassword`（重置后吊销其全部登录会话）；插件 `adminRoles: ['SUPERADMIN']` 即天然门控  
  - 自定义保护（插件没有，需 hook/前置校验）：**最后一名 SUPERADMIN 不可降级**（防锁死）；不可改自己的角色为 USER 时同理校验  
  - Admin 页新增「用户管理」节，仅 SUPERADMIN 可见；USER 登录 Admin 仅见自己的配置管理  
  - 涉及：`src/api/admin.controller.ts`（或独立 `users.controller.ts`）、`user-auth.ts`（role 门控）、`frontend/src/admin/`  
  - 验收：USER 调用用户管理接口 403；超管可改他人角色；唯一超管降级被拒

---

## T4-03 服务端会话与持久化（仅已登录）

- [x] **T4-03-01** `GET /api/sessions`、`POST /api/sessions`、`DELETE /api/sessions/:id`（仅当前用户）  
  - 所有查询强制 `userId` 过滤（防跨用户泄漏）  
  - `title`：创建后由首条 user 消息截断生成（落库时顺带 update，无 LLM 调用）  
  - `DELETE` 级联删除该会话全部 `ChatMessage`（append-only 约束只针对消息内容不可改写，**会话级删除允许**）  
  - 涉及：`src/api/sessions.controller.ts`、`chat-store.service.ts`  
  - 验收：用户隔离；A 用户拿不到 B 的会话（404/403）；删会话后消息不残留

- [x] **T4-03-02** `GET /api/sessions/:id/messages`（分页，**只读**）  
  - 字段对齐 P0 完整 graph（content/toolCalls/reasoning）  
  - **无** 前端写消息端点——消息只由 T4-03-04 服务端落库  
  - 验收：换浏览器同账号可拉历史；分页正确

- [x] **T4-03-03** authed 上下文 **服务端组装**（核心 · 上）  
  - `normalize-web-inbound.ts`：检测登录态 → body 只带 `sessionId` + 新 user 消息 → 从 `ChatMessage` 单查询取历史 + 注入 `compactBaselineJson` 基线（摘要 + tail 切片，复刻前端 `buildApiContextMessages` 语义）→ 组完整 `payload.messages` 入队（Envelope/Worker/Harness 链路 **零改动**）  
  - **用户偏好参与组装**：`messageHistoryCount` 等影响上下文的本地设置随请求 body 上行（authed 模式新增 `contextOptions` 字段），服务端按其裁剪历史；缺省用 config 默认值  
  - `context-preview` / `compact` 端点：authed 时 messages 来源同上（服务端取），不再依赖 body 全量上行  
  - 自动压缩（`context_compacted`）产生的新基线：**服务端回写** `ChatSession.compactBaselineJson`（不能只发 SSE 给前端）  
  - guest 请求：维持现网 `messages[]` 路径，零改动  
  - 涉及：`normalize-web-inbound.ts`、`ai.controller.ts`、`context-budget.ts` 回写点、`chat-store.service.ts`  
  - 验收：authed 请求体无历史 `messages[]`，多轮上下文正确；手动/自动压缩后换设备基线一致

- [x] **T4-03-04** 轮末落库 + **Abort 解耦**（核心 · 下）  
  - 轮次结束将本轮 user/assistant/tool 消息**单事务批量** append 入 `ChatMessage`；钩子挂 `agent-loop.ts` `SessionEnd`（与 memory-retain 并列），hook payload 增加 `userId` + `chatSessionId`  
  - **解耦**：客户端断开 → abort 仅停止 LLM 生成；已产出轮次仍落库；`SessionEnd` 用 `try/finally` 保护（现网 abort 抛错会跳过 hook，必须修）；`inbound-worker.ts` 提前 return 路径同样保证落库执行  
  - 幂等：消息 ID 服务端生成；与 `inbound-queue` 的 `requestId` 幂等键互不干扰  
  - 涉及：`agent-loop.ts`、`inbound-worker.ts`、`memory-retain-hook.ts` 同位钩子、`chat-store.service.ts`  
  - 验收：发消息中途关页/断网，刷新后本轮已产出内容完整出现在历史；重试不产生重复消息

---

## T4-04 前端双模式

- [x] **T4-04-01** 存储抽象 + **拆 `session_` 前缀假设**  
  - 新建 `frontend/src/chat/session-store.js`：`guest` → 现有 `data.js`/IDB；`authed` → sessions API（只读 + 发新消息）；启动 `GET /api/auth/me` 判定模式  
  - 拆硬编码：`core.js:439-448`（非 `session_*` 即重生成——会**覆盖**服务端 ID，必须改为按模式校验）、`ui/history-modal.js:83-85`（过滤非 `session_*`——会**隐藏**服务端会话）、`data.js:347` 展示 `replace('session_','')`  
  - 涉及：`session-store.js`、`core.js`、`data.js`、`ui/history-modal.js`、`storage-contract.js`（契约注明双模式 ID 格式）  
  - 验收：authed 的服务端 cuid 不被重生成/不被过滤；guest `session_*` 行为不变

- [x] **T4-04-02** **未登录**：保持现网行为（`session_*`、IDB 加载/保存、body `messages[]`）  
  - 涉及：`core.js`、`data.js`  
  - 验收：不登录时行为与 T4 前一致（回归）

- [x] **T4-04-03** **已登录**：`sessionId` 用服务端 `ChatSession.id`；列表/历史 `GET` 自 API；请求 body 只带 `sessionId` + 新消息  
  - 本地不写消息（流式渲染仅内存态；刷新后从服务端拉）；停用 `persistMessageHistory` 的 authed 分支  
  - 上下文面板/手动压缩走 T4-03-03 的服务端数据源，不再先组本地全量  
  - 涉及：`core.js`、`api.js`、`chat-request-body.js`  
  - 验收：Memory retain、权限会话键与 server sessionId 一致；请求体不含历史 `messages[]`

- [x] **T4-04-04** 登录后 UX：会话列表切到服务端；本地 IDB 会话 **不导入、不合并、不展示**（ChatGPT 同款隔离策略）  
  - IDB 数据原地保留，登出回 guest 模式后可继续读写  
  - 涉及：聊天 UI、`data.js`  
  - 验收：登录后看不到 guest 会话；登出后 IDB 历史完好

- [x] **T4-04-05** `localStorage` 偏好与压缩基线分键  
  - guest：压缩基线沿用 `aiCompactBaseline:{session_*}` 本地键  
  - authed：基线**只在服务端**（`ChatSession.compactBaselineJson`，由 T4-03-03 读写），本地不留副本  
  - 涉及：`storage-contract.js`、`api.js`  
  - 验收：登录/登出切换会话不串基线；authed 换设备基线随会话同步

---

## T4-05 外接记忆按身份隔离 + guest 关闭

- [x] **T4-05-01** Hindsight 外接记忆按身份隔离 + guest 关闭  
  - **目标**：bankId 按身份分段，recall 与 retain 共用同一 bankId（REFERENCES「记忆多租户隔离」）。  
  - **分渠道**：  
    - **Web authed**：`scopeKey=web:{userId}` → `mcp-client-web-{hash12}`。  
    - **Web guest**：`resolveMemoryBankId` 返回 `undefined`，跳过 recall/retain；设置卡片变灰，红点旁「登录后可用」，隐藏调试。  
    - **IM**：`feishu:{chatId}` / `dingtalk:{conversationId}(:{robotCode})` → `mcp-client-feishu-*` / `mcp-client-dingtalk-*`；按会话分段，不按 Web 账号。飞书同群多 app 的 `chatId` 碰撞接受。  
  - **方案**：  
    - `MemoryIdentityScope`（`channel.types.ts`）；`profile-resolver` 构造 `memoryScope` → `ResolvedChatProfile`。  
    - `resolveMemoryBankId(scope?)` 单一入口（`memory-pipeline-context.ts`）；`resolveHindsightBankId(channel, scopeKey)`（`hindsight-memory-provider.ts`）。  
    - `ai-provider` 透传 `memoryScope`；`memory-debug` 入参 `MemoryIdentityScope`，guest 返回 `bankId: null`。  
    - 设置 UI：已连接=绿点+调试；未连接=红点+原因文案（「未配置」/「登录后可用」），隐藏调试。  
  - **不做**：迁移旧 bank；记忆不进配置 UI；IM 不下沉 open_id。  
  - **前置**：T4-03 `channelMeta.userId` + `profile-resolver` 会话 id  
  - **涉及**：`src/types/channel.types.ts`、`src/types/config-plane.types.ts`、`src/config-plane/profile-resolver.ts`、`src/core/memory/hindsight-memory-provider.ts`、`src/core/memory/memory-pipeline-context.ts`、`src/core/memory/memory-debug.ts`、`src/api/memory-debug.controller.ts`、`src/providers/ai-provider.ts`、`frontend/src/chat/ui/settings-modal.js`、`frontend/src/chat/ui/modal-host.js`、`frontend/src/chat/style.css`  
  - **验收**：账号间不串 recall；guest 不 recall/retain；IM 会话/机器人隔离；同账号跨设备一致；bankId 含可读渠道段；设置 UI 状态与调试入口符合上述规则

---

## T4-06 配置 per-user 化

> 现网 `AIProvider`/`Setting`/`MCPServer`/`AgentProfile`/`RouteRule` 均为全局单份。本组改为 **两层 override**：`userId=null` 默认 seed（基线）+ 每账号覆盖行；生效配置 = 用户行优先、miss 回退 seed。**「miss 逐级回退（nil 继承）」是市面共识**：调研 6 家中 5 家如此（LibreChat base+override deep-merge、ABP Default→Global→Tenant→User、Open WebUI Admin baseline+User、Dify 4 级 resolve）；唯 GitLab 现版改「写时向子级传播」，本项目**刻意不采用**（破坏 seed 自动传播 + 引入异步 worker）。**集合配置用数组替换（非拼接）**（LibreChat / Open WebUI 一致）。**无「天花板」语义**：各账号完全独立 override、互不设上限（区别于 Open WebUI Admin 为用户不可破上限），契合「配置修改不分角色」，为有意识取舍。**默认 seed 只由 seed 脚本维护，不经任何 UI**。

- [x] **T4-06-01** schema：配置表加 `userId?` 维度  
  - `AIProvider`、`Setting`（tool-prompt 等）、`MCPServer`、`AgentProfile`、`RouteRule` 增加 `userId?`（null = guest/IM 默认 seed）；唯一约束改为 `(userId, key)` 复合  
  - seed 脚本：`prisma/seed` 维护默认配置行（替代「超管管理 guest 配置」）  
  - 涉及：`prisma/schema.prisma`、migration、seed  
  - 验收：migration 成功；默认行可重复 seed（幂等 upsert）

- [x] **T4-06-02** 配置解析链：override 解析 + userId 透传  
  - **前置（必先修）**：Bus 序列化层 `inbound-envelope.ts`（`serializeWebInbound` 漏拷 `userId`）+ `channel.schema.ts`（zod schema 无 `userId` 字段）当前**未透传 `userId`**，BullMQ 路径上 Worker 拿不到 → 已影响 T4-03 落库 / T4-05 记忆；本子项先补齐序列化 + schema，再做 per-user 配置  
  - 解析语义（ABP/LibreChat/Open WebUI/Dify 共识的 nil 继承）：**用户行存在 → 用，不存在 → 回退 `userId=null` seed**；只存覆盖差异，不登录拷贝（不采 GitLab 写时传播）  
  - 标量配置（tool-prompt、参数）按键覆盖；集合配置（供应商、MCP 服务器、AgentProfile）：**数组替换非拼接**——用户行归用户增删，seed 行只读可见、被同 key 用户行遮蔽  
  - `ConfigService` / `config-snapshot` / `profile-resolver` 入参增加 `userId?`；解析结果按 `(userId)` 键控 **TTL 缓存**（`lru-cache`，如 60s，LibreChat #12354 同款；写操作即时失效）  
  - **空结果缓存（负缓存）**：无 override 行的账号缓存「→seed」结果，避免每请求查库（LibreChat #12354 同款；guest/IM 的 `null` 键同理）  
  - **DB 故障回退**：配置**运行时读取**遇 DB 瞬时错误 → 回退 seed/base 并 `console.error` 告警（不中断聊天，高可用）；**启动期 seed 缺失仍 `throw`**（不掩盖配置缺失，守 main-rule）  
  - Envelope `channelMeta` 增加 `userId?`（Web authed 注入），Bus 链路透传给 Harness/配置解析  
  - 涉及：`src/services/config.service.ts`、`src/config-plane/*`、`channel.types.ts`、`channel.schema.ts`、`src/message-bus/inbound-envelope.ts`、`normalize-web-inbound.ts`  
  - 验收：两账号各改各的互不可见；未覆盖项跟随 seed 更新自动生效；guest 始终默认值；无 override 账号二次请求不查库；DB 故障时回退 seed 且有告警日志；Bus 路径 Worker 能拿到 `userId`

- [x] **T4-06-03** 写入语义与 UI 继承态  
  - 保存 = 写/改该用户覆盖行；**恢复默认 = 删除覆盖行**（回落 seed），settings/admin API 提供 reset 端点  
  - UI 区分「继承中（默认值）/已覆盖（自定义）」两种状态（GitLab 式视觉标识），避免「以为改了其实在看默认」  
  - 涉及：`settings.controller.ts`、`admin.controller.ts`、Admin/设置前端  
  - 验收：reset 后回到 seed 值；UI 可辨识继承/覆盖

- [x] **T4-06-04** 供应商实例 per-user 化  
  - provider 实例/缓存按 `userId` 键控（guest/IM 用 `null` 键）；reload 只刷新自己的  
  - **空闲上限 + 回收**（仿 T4-06-05 MCP 连接池）：per-user 常驻 `AiProvider` 实例随账号数膨胀内存，加 LRU 上限/空闲超时回收（上限/TTL 进 config）；现 `providerServices: Record<name, AiProvider>` 全局 Map 需改为按 `(userId)` 分桶  
  - 涉及：`src/providers/ai-providers.ts`（全局 Map 改 per-user 分桶 + 回收）、`src/providers/ai-provider.ts`、`settings.controller.ts`  
  - 验收：账号 A 换 Key 不影响账号 B 与 guest 的调用；空闲实例按时回收；实例数有上限

- [x] **T4-06-05** MCP 连接按 `(userId, serverId)` 隔离  
  - 连接池键控 `userId`（guest/IM 共享 `null` 池）；**懒连接 + 空闲回收**（防多账号连接数膨胀，上限/超时进 config）  
  - `tools/call`、connect/switch/disconnect、tool-preferences 全部作用于自己的池与配置  
  - 涉及：`src/core/mcp/server-connection.ts`、`mcp-manager`、`info.controller.ts`  
  - 验收：账号 A 断开某 server 不影响 B；空闲连接按时回收

- [x] **T4-06-06** IM 渠道绑定账号（超管）  
  - **背景**：IM 无 User 行，配置走 `RouteRule(channel, matchKey) → AgentProfile`（T2）、用默认 seed 资源。让超管指定某 IM 路由以哪个账号身份解析配置，复用 T4-06 per-user 覆盖链，零新增配置层。  
  - **粒度**：绑定挂 `RouteRule`（channel+matchKey），新增 `boundUserId?`，可按群/机器人分别绑账号。  
  - **作用域**：仅配置/资源——IM 入站以 `userId=boundUserId` 跑 T4-06-02 覆盖链（providers/Key、MCP、Setting、prompt）。记忆维度不受影响，仍按 T4-05 的 `channel+会话 id(+robotCode)` 隔离（避免多终端用户混库 + 隐私）。  
  - **权限**：整个「渠道管理」Tab（渠道/路由配置 + 账号绑定）仅 SUPERADMIN 可见可改，非超管完全不渲染该入口（把账号 Key/配置授权给共享渠道属组织级特权）；应绑专用服务账号。  
  - **回退**：`boundUserId` 为空或账号被删/降级 → 回退默认 seed（`userId=null`）。  
  - **方案**：`RouteRule.boundUserId?`；`profile-resolver`/`config.service` 用 `boundUserId` 作 per-user 解析 key；Admin 端提供路由列表 + 绑定账号下拉（仅超管）。  
  - **前置**：T4-06-01、T4-06-02、T4-02-05  
  - **涉及**：`prisma/schema.prisma`、`src/config-plane/profile-resolver.ts`、`src/services/config.service.ts`、`src/api/admin.controller.ts`、Admin 前端  
  - **验收**：超管给某 IM 路由绑账号 A 后该路由用 A 的 providers/MCP/prompt；解绑/账号失效回退 seed；非超管完全看不到「渠道管理」Tab；IM 记忆仍按会话隔离

---

## T4-07 高级配置 + 系统初始化

> 现网无 `prisma/seed.ts`：seed = `userId=null` 配置行（`initConfigPlane` / `POST /api/admin/seed` 写 AgentProfile/RouteRule），不建 User；guest 走 `resolveUserSnapshot(null)`。本组：启动幂等建 `admin`/`seed` 账号；`seedFollowUserId` **仅超管在用户管理页保存**，代码不写默认归属；顶栏「高级配置」+ Tab「渠道管理 | 用户管理」；渠道 Tab UI 重构见 **T4-07-05**。设计稿：`frontend/design/admin-advanced-config.html`。

- [x] **T4-07-01** 启动 bootstrap：`admin` + `seed`  
  - `app.ts` 启动、`initConfigPlane` 前：按 username 幂等创建 User + Account（credential/argon2id）；`admin`→SUPERADMIN、`seed`→USER；email `{username}@local.dev`；初密 `12345678`（**仅首次**，已存在不改密码/角色）  
  - 涉及：`src/lib/bootstrap-users.ts`、`app.ts`  
  - 验收：空库首次启动可 `admin`/`seed` 登录；重启不重复建、不改密

- [x] **T4-07-02** 默认配置归属：`seedFollowUserId`（解析链，不写初值）  
  - `Setting`（`userId=null`，`key=seedFollowUserId`）；**启动/bootstrap 不写入**，空 = guest 走 `userId=null` 行（与现网一致）  
  - guest / IM 无 `boundUserId`：有归属 → `resolveUserSnapshot(followId)`；无归属 → `null`；guest 只读 GET、MCP/provider 池同 `configUserId`；**不落库**  
  - 优先级：`boundUserId` > `seedFollowUserId` > `userId=null`；跟随账号删除 → 回退 null 行  
  - 涉及：`seed-follow.service.ts`、`profile-resolver.ts`、`settings.controller.ts`、`config-plane.types.ts`  
  - 前置：T4-06-02（与 T4-07-01 无硬依赖，可并行）  
  - 验收：未配置时 guest 同现网 null 行；超管保存归属后 guest 与目标账号有效配置一致；清空或删号回退 null 行

- [x] **T4-07-03** Admin IA：「高级配置」+ 内 Tab  
  - 顶栏 `navbar.js`「渠道管理」→「高级配置」；`admin.html` title 同步；整页 SUPERADMIN 门控  
  - 页内 Tab 壳「渠道管理 | 用户管理」；移除 header「用户管理 / 退出 / 已连接」（登录态仅顶栏 `nav-auth`）  
  - **渠道 Tab 具体 UI 见 T4-07-05**；本项先落 Tab 切换与用户管理 Tab 挂载点  
  - 涉及：`navbar.js`、`admin.html`、`admin/app.js`、`admin/style.css`  
  - 前置：T4-02-03、T4-02-05  
  - 验收：超管见两 Tab；USER 不可进；页内无重复退出/用户管理按钮

- [x] **T4-07-04** 用户管理 Tab（归属唯一写入口）  
  - **默认配置归属**：账号下拉 + 保存 → 写 `seedFollowUserId`；上线后由超管自行确认（常见选 `seed`，但不自动写入）  
  - **用户列表**：列表、改他人角色、**全员**重置密码（含当前登录超管）；**不可修改自己的角色**；**最后一名 SUPERADMIN 不可降级**（复 `users.controller` 规则）  
  - 涉及：`users.controller.ts`、`routes.ts`、Admin 前端  
  - 前置：T4-07-02、T4-07-03  
  - 验收：仅此处可改归属；保存后 guest 生效（缓存失效）；未保存前 guest 仍 null 行；当前超管行角色控件禁用、重置密码可用

- [x] **T4-07-05** 渠道管理 Tab UI 重构（绑定 + 预览，对齐设计稿）  
  - **布局**：左侧渠道列表（绿/红/灰点 = SDK Stream/WS 已连 / 失败或未连 / 未配凭证）；右侧 panel 与用户管理同风格  
  - **可编辑（唯一写入口）**：「渠道绑定账号」——绑定下拉（**仅已注册用户，无「不绑定」**）+「保存绑定」→ `RouteRule.boundUserId`；卡片右上角胶囊为已保存账号（未保存红 `!`）；未绑定解析回退种子账号  
  - **生效配置预览**（绑定**下方**、只读）：对话模型 / MCP / 行为与限制；原手填 editor **下线不可编辑**；副标题引导「修改请前往该账号的「配置管理」」；**无**预览卡片右上角「只读」标签  
  - **工具执行方式预览**：账号「确认」→ 展示「确认 → 只读」+「IM 渠道不支持确认，执行时强制按只读生效」；账号「只读/自动」→ 单胶囊（样式一致）；IM 解析链 `interactive` 强制 `locked`（与 `permission-gate` 一致）  
  - **SDK 连接态**：`startChannels` 有凭证则尝试连接；各 listener 维护 `connected / disconnected / skipped`；Admin `GET` 渠道状态供左侧列表渲染  
  - **移除**：页头整页「保存 / 放弃 / 未保存」；页头「已连接」（非 SDK 态）  
  - 涉及：`dingtalk-stream-listener.ts`、`feishu-event-listener.ts`、`profile-resolver.ts`（IM permission 降级）、`admin.controller.ts` / `routes.ts`、`frontend/src/admin/`  
  - 前置：T4-07-03、T4-06-06、T4-07-02（预览取绑定账号有效配置）  
  - 验收：绑定保存后预览与 IM 入站 effective 配置一致；确认账号 IM 实际只读；左侧点色与 listener 态一致；不可再 UI 改渠道 RouteRule 手填字段

---

## T4-08 二期（搁置，按 2026 实践预留方向）

- [ ] **T4-08-01** Harness checkpoint：每轮结束异步持久化 `LoopState`（**仅已登录** server session）  
  - 涉及：`agent-loop.ts`、`loop-state.ts`  
  - 验收：进程重启可恢复 checkpoint（手工 E2E）

- [ ] **T4-08-02** 断流续传（durable streaming）：`ChatSession.activeStreamId` + 流式 chunk 持久化；刷新/重连后 `GET /api/chat/:sessionId/stream` 续播，无活跃流返回 204  
  - 实现基于 `resumable-stream`（Vercel 官方，**二期才加依赖**）  
  - 前置：T4-03-04 已把生成过程与 HTTP 生命周期解耦（一期完成）  
  - 验收：流式中刷新页面，回复继续播完不丢

- [ ] **T4-08-03** per-user 密钥静态加密（AES-256-GCM）  
  - **已评估**：现网 `AIProvider.apiKey` 明文存 SQLite，per-user 化后多账号 Key 明文同库泄露面放大；Dify（per-tenant RSA/AES）+ n8n（env master key + AES-256-GCM）证明业界 per-user 密钥需静态加密  
  - **决策**：当前 demo 级、单机自用，一期不做；转生产再落地——推荐 **n8n Cipher 同思路**（env `CONFIG_ENC_KEY` + Node 原生 `crypto` AES-256-GCM，零依赖，弃 Dify RSA-文件方案的「丢私钥全丢」footgun），UI 采**掩码回显 write-only**（n8n/Dify/OpenWebUI 同款，前端不回传明文）  
  - 前置：T4-06-02（per-user 配置链）、T4-06-04（供应商实例 per-user 化）  
  - 验收：DB 内 `apiKey`/MCP headers/tokens 为密文；日志/SSE 不露明文；master key 缺失启动报错

---

## T4 完成检查清单

- [ ] 用户名+密码注册/登录（Argon2id）；无 `ADMIN_API_TOKEN`；登出即时吊销
- [ ] 注册开放：首账号 SUPERADMIN、后续 USER；超管可在用户管理改角色；唯一超管不可降级
- [ ] 角色不限制配置修改：USER 同样可改自己的全部覆盖层配置
- [ ] 未登录可聊天，历史在 IndexedDB；行为与 T4 前一致
- [ ] 已登录：服务端组上下文（请求只带 sessionId + 新消息）；轮末落库断流不丢
- [ ] 消息 append-only、服务端 ID；换设备历史与压缩基线同步
- [ ] 同一条消息不同时写 IDB 与 DB；guest/authed 数据互不可见
- [ ] Admin 与配置写操作需登录；chat 与 GET 读接口匿名仍可用；guest 配置只读（服务端默认 seed）
- [ ] 快捷消息本地自治（服务端仅种子）；改动不影响其他浏览器
- [x] T4-07：bootstrap `admin`/`seed`；超管在用户管理指定 `seedFollowUserId`；高级配置 Tab；渠道 Tab 绑定+预览 UI（T4-07-05）
- [ ] 配置解析：nil 继承（非写时传播）；集合数组替换；TTL + 空结果缓存；DB 故障回退 seed 并告警；Bus 路径透传 userId
- [ ] provider 实例池/MCP 连接池按 userId 键控，空闲上限 + 回收
- [x] 外接记忆按身份隔离（`mcp-client-{channel}-{hash12}`）；guest 关闭；IM 按会话分段；设置 UI 状态与调试入口符合 T4-05-01
- [ ] 服务端 ID 不被前端 `session_` 假设覆盖/过滤

---

## 相关代码入口

```
prisma/schema.prisma
src/lib/auth.ts                           # 新增：betterAuth 实例（username/admin 插件 + argon2 hasher）
src/services/chat-store.service.ts        # 新增：存储收口（拓展点）
src/api/admin-auth.ts                     # T4-02-02 删除
src/api/admin.controller.ts
src/api/ai.controller.ts                  # T4-03-03 authed 分流
src/channels/web/normalize-web-inbound.ts # T4-03-03 服务端组上下文
src/core/agent-harness/agent-loop.ts      # T4-03-04 SessionEnd 落库 + finally
src/message-bus/inbound-worker.ts         # T4-03-04 Abort 解耦
frontend/src/admin/app.js                 # 去掉 X-Admin-Token
frontend/src/chat/session-store.js        # 新增：双模式抽象
frontend/src/chat/core.js                 # 拆 session_ 假设
frontend/src/chat/data.js
src/api/routes.ts
src/types/channel.types.ts                # T4-05 MemoryIdentityScope
src/core/memory/hindsight-memory-provider.ts  # T4-05 resolveHindsightBankId(channel, scopeKey)
src/core/memory/memory-pipeline-context.ts  # T4-05 resolveMemoryBankId
src/core/memory/memory-debug.ts           # T4-05 调试按 MemoryIdentityScope
src/api/memory-debug.controller.ts
src/config-plane/profile-resolver.ts      # T4-05 memoryScope；T4-06 userId 分流
frontend/src/chat/ui/settings-modal.js    # T4-05 跨会话记忆状态 UI
src/services/config.service.ts            # T4-06 userId 分流
src/core/mcp/server-connection.ts         # T4-06-05 连接按 userId 键控
src/providers/ai-providers.ts             # T4-06-04 全局 Map 改 per-user 分桶 + 回收
src/message-bus/inbound-envelope.ts       # T4-06-02 前置：补 userId 序列化透传
src/types/channel.schema.ts               # T4-06-02 前置：zod schema 补 userId 字段
frontend/src/shared/navbar.js              # T4-07-03 顶栏「高级配置」
frontend/design/admin-advanced-config.html # T4-07 UI 设计稿（渠道 + 用户管理 Tab）
frontend/src/admin/app.js                  # T4-07-04/05 Admin Tab 与渠道预览
src/channels/dingtalk/dingtalk-stream-listener.ts  # T4-07-05 SDK 连接态
src/channels/feishu/feishu-event-listener.ts       # T4-07-05 SDK 连接态
src/lib/bootstrap-users.ts                 # T4-07-01 启动建 admin/seed
src/services/seed-follow.service.ts        # T4-07-02 seedFollowUserId 解析
```
