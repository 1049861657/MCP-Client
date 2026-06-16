# T3 — 遗留 Web UI 现代化（单体 Vite MPA + Tailwind v4）

> **范围**：`public/` 遗留 HTML/JS/CSS → `frontend/` + 单 `vite.config.ts`；功能契约不变；不要求像素复刻  
> **验证**：`pnpm start` + 浏览器手工（不引入 E2E）  
> **参考**：[REFERENCES.md § T3](./REFERENCES.md#t3-前端现代化-2026-业界参考)

---

## 目录（SSOT）

```
frontend/
├── vite.config.ts
├── index.html                  → public/index.html
├── admin.html                  → public/admin.html
├── ai.html                     → public/ai.html       （T3-04 切流）
├── settings.html               → public/settings.html （T3-03）
├── info.html                   → public/info.html     （T3-03）
└── src/
    ├── shared/                 # theme · navbar · fetch-json · ui/
    ├── landing/
    ├── admin/
    ├── chat/                   # T3-04
    ├── settings/               # T3-03
    └── info/                   # T3-03

根目录 *.html = 入口；src/{page}/ = 实现。禁止 frontend/{page}/index.html 子目录入口。
构建：pnpm run build:frontend  →  vite build --config frontend/vite.config.ts
```

---

## 设计定稿

| 主题 | 决策 |
|------|------|
| 架构 | 单体 Vite [MPA](https://vite.dev/guide/build.html#multi-page-app)；`outDir: ../public`；`emptyOutDir: false` |
| 样式 | `src/shared/theme.css`（仅 `@theme`）+ 各页 `style.css`（`@import` theme → tailwind → post-tailwind）；Tailwind v4 默认 content 扫描（`@tailwindcss/vite`）；无 `tailwind.config.ts` |
| 逻辑 | 原生 JS + ESM；`createChatApp()` 单对象；settings/info 不 import chat |
| 导航 | `src/shared/navbar.js`，各页 module 内 import 一次 |
| 迁移 | Strangler：旧 `public/js` 与 `frontend/` 共存，**仅切流 PR 替换 HTML**；T3-07 删遗留 |

### 功能契约（不可破坏）

| 契约 | 验证 |
|------|------|
| `localStorage` `aiChatSettings` | 改设置 → 刷新仍生效 |
| `aiCompactBaseline:{sessionId}` | 压缩态保留 |
| IDB 与现 `ai-data.js` 一致 | 旧 profile 历史可读 |
| SSE 帧 | 发消息 + 停生成 |
| 请求体 | 对照 `normalize-web-inbound` |
| Admin API | 不改 `/api/admin/*` |

---

## 开发顺序

`T3-01` ✓ → `T3-02` ∥ `T3-03` → `T3-04` → `T3-05` → `T3-06`（可选）→ `T3-07`

| 门禁 | 关闭条件 | 阻塞 |
|------|----------|------|
| **G1** | T3-01 完成 | T3-02～04 |
| **G3** | T3-04-06 + 手工 SSE | T3-04-07～11 |
| **G4** | T3-04-12 单独 PR | 须 04-07～11 已合并 |

---

## T3-01 单体基建 ✓

> 完成日期：2026-05-29。G1 已关闭。

- [x] **T3-01-01** 目录 + `src/{shared,landing,admin}/`；HTML 平铺 `index.html`、`admin.html`
- [x] **T3-01-02** `frontend/vite.config.ts`；`input`: index + admin；产物 `public/*.html` + `public/assets/`
- [x] **T3-01-03** `src/shared/` 模块（theme、navbar、fetch-json、toast、modal）
- [x] **T3-01-04** landing + admin 可 `vite build`
- [x] **T3-01-05** Tailwind v4 各页 `style.css` 模板
- [x] **T3-01-06** 根 `build:frontend` 单次 vite

---

## T3-02 Landing + 导航

- [x] **T3-02-01** 重写 `index.html` + `src/landing/`；链到 ai / settings / info / admin（2026-05-29）

- [x] **T3-02-02** `navbar.js` 接入五页（2026-05-29）

- [x] **T3-02-03** landing 不依赖 `public/css/styles.css`（2026-05-29）

---

## T3-03 Settings + Info

> **方针**：两页 **全量重写**（Tailwind v4 + ESM + `src/shared/*`），非剪切遗留 CSS/JS；功能与 API 契约不变。

- [x] **T3-03-01** Settings 全量重写  
  - **替换**：`public/settings.html` + `public/js/settings.js` → `frontend/settings.html` + `src/settings/`  
  - **UI**：侧边栏提供商列表 + 主区卡片表单，Tailwind utility 重做（沿用 `theme.css` token，不拷 500 行内联 CSS）  
  - **逻辑**：`main.js` 挂 `navbar`；`app.js` ESM 重写 CRUD（`fetch-json`、保存/reload）；删除用 `confirmModal`；通知用 `toast`  
  - **vite**：`input` 增加 `settings.html`  
  - **禁止**：`ai-ui.js`、`ai-*`、`styles.css` / `ai-chat.css`、`legacy-navbar.js`  
  - **验收**：`/settings.html` 提供商增删改、默认提供商、保存后 reload；Network 仅 `/api/settings/*`（2026-05-29）

- [x] **T3-03-02** Info 全量重写  
  - **替换**：`public/info.html`（含 ~640 行内联 CSS、~726 行内联 script）→ `frontend/info.html` + `src/info/`  
  - **UI**：服务器 Tab、连接表单（stdio/HTTP）、连接开关、工具列表+参数表，Tailwind 重做  
  - **逻辑**：`app.js` ESM 重写（`/api/info`、server 增删改连断切、reload-config）；删除用 `confirmModal`  
  - **vite**：`input` 增加 `info.html`  
  - **禁止**：`ai-ui.js`、`window.AIChatUI`、遗留全局 CSS  
  - **验收**：工具列表与连接态正常；`grep AIChatUI frontend/src/info` 为零；API 路径与现网一致（2026-05-29）

---

## T3-04 Chat（分 PR · 全量重写）

> **方针**：`public/js/ai-*`（~8k 行）+ `public/css/ai-*`（~3.5k 行）→ `src/chat/` ESM 模块 + Tailwind UI；**04-00～11 不切流**，**仅 04-12** 替换 `public/ai.html`。

```
04-00 脚手架 → 04-01 纯逻辑 → 04-02 IDB → 04-03 SSE → 04-04 core
  → 04-05 renderers → 04-06 最小 UI（G3）
    → 04-07～11 模态/扩展（可并行）→ 04-12 切流（G4，单独 PR）
```

- [x] **T3-04-00** Chat 脚手架  
  - **新建**：`frontend/ai.html`（壳）+ `src/chat/main.js` + `style.css`（theme→tailwind→@source）  
  - **vite**：`input` 增加 `ai.html`（构建可先产出但不改现网入口，或 04-12 前注释）  
  - **禁止**：本步替换 `public/ai.html`、删 `public/js`  
  - **验收**：`vite build` 含 chat 入口无报错（04-12 前 `input` 注释；开发期 `pnpm dev:frontend` 访问 `/ai.html`）（2026-05-29）

- [x] **T3-04-01** 纯逻辑 ESM  
  - **替换**：`ai-utils.js`、`ai-turn-collector.js`、`message-history-builder.js` → `src/chat/*.js`  
  - **形态**：无 DOM、`export` 函数；消灭 `window.AIChat*` 全局  
  - **验收**：单元可被 04-04 import；无 document 引用（2026-05-29）

- [x] **T3-04-02** 会话存储  
  - **替换**：`ai-data.js` → `src/chat/data.js`（或 `idb.js`）  
  - **契约**：IDB 库名/版本/对象仓库与现网一致；profile 历史可读  
  - **验收**：读旧会话成功；新建/切换/删除会话行为不变（2026-05-29）

- [x] **T3-04-03** SSE 与压缩基线  
  - **替换**：`ai-api.js` 流式与 abort → `src/chat/api.js`  
  - **契约**：帧类型 `begin`/`data:`/`usage|done|context_compacted`/`error`；`aiCompactBaseline:{sessionId}` 读写不变；请求体含 `mcpServerIds`、`chatOptions`  
  - **验收**：发消息、停生成、压缩后刷新态保留（2026-05-29）

- [x] **T3-04-04** `createChatApp()`  
  - **替换**：`ai-core.js` → `src/chat/core.js` 导出 `createChatApp()`  
  - **边界**：编排 data/api/renderers；**不** import 模态 DOM 模块（模态在 04-07+ 注入）  
  - **验收**：可在无模态环境下跑通 04-06 最小链路（2026-05-29）

- [x] **T3-04-05** 渲染器 + Markdown  
  - **替换**：`ai-renderers.js` + CDN marked/hljs → `src/chat/renderers.js` + npm 依赖  
  - **UI**：工具卡片/推理块/代码高亮 Tailwind 化，不拷 `ai-components.css`  
  - **验收**：Markdown、代码块、tool-call 展示正常（2026-05-29）

- [x] **T3-04-06** 最小聊天 UI — **G3**  
  - **UI**：Tailwind 重做消息区、输入区、发/停；`main.js` 挂 navbar  
  - **接线**：`createChatApp()` + 04-03 SSE 端到端  
  - **验收**：手工 SSE 收发停；**G3 关闭**（2026-05-29，开发入口 `/ai.html` 未切流）

- [x] **T3-04-07** 历史模态  
  - **替换**：`ai-ui` 历史相关 + `ai-modals.css` 对应块 → `src/chat/ui/history-modal.js` + Tailwind  
  - **验收**：打开/搜索/切换/删会话（2026-05-29）

- [x] **T3-04-08** 设置模态  
  - **替换**：聊天设置 UI → `src/chat/ui/settings-modal.js`  
  - **契约**：`localStorage` `aiChatSettings` 键与字段不变  
  - **验收**：改设置刷新仍生效（2026-05-29）

- [x] **T3-04-09** MCP + 压缩模态  
  - **替换**：MCP 选择、压缩预览 → `src/chat/ui/mcp-modal.js`、`compact-modal.js`  
  - **验收**：选 MCP、查看压缩上下文（2026-05-29）

- [x] **T3-04-10** QuickMessage  
  - **替换**：`ai-quickmessage.js` → `src/chat/ui/quickmessage.js`  
  - **验收**：增删改快捷消息、插入输入框（2026-05-29）

- [x] **T3-04-11** 工具卡片与子 Agent  
  - **替换**：工具结果区、子 Agent 进度 → `src/chat/ui/tool-cards.js`（+ 必要 render 钩子）  
  - **验收**：工具调用展示、长任务进度可见（2026-05-29）

- [x] **T3-04-12** 切流 — **G4**（单独 PR）  
  - **改动**：`frontend/ai.html` 构建覆盖 `public/ai.html`；移除动态 `ai.js` loader 链  
  - **禁止**：与本 PR 夹带 04-07～11 未测功能  
  - **验收**：`/ai.html` 全功能回归；旧 `public/js/ai-*.js` 无引用；**G4 关闭**（2026-05-29）

---

## T3-05 契约审计

- [x] **T3-05-01** 存储契约文档化  
  - **新建**：`src/chat/storage-contract.js` — IDB / `localStorage` 常量 + JSDoc  
  - **验收**：与 04-02、04-08 实现一致，无魔法字符串散落（2026-05-29）

- [x] **T3-05-02** 入站 body 对照  
  - **改动**：`src/chat/api.js` 请求体对齐 `src/channels/web/normalize-web-inbound.ts` 与现有测试  
  - **验收**：相关测试通过；手工抓包与改造前一致（2026-05-29；`chat-request-body.js` + `pnpm test:frontend`）

- [x] **T3-05-03** 文档与引用清扫  
  - **改动**：grep `public/js`、`frontend/admin/` 等过时路径；更新 ROADMAP、P*.md  
  - **验收**：文档指向 `frontend/src/*`（2026-05-29）

---

## T3-06 Admin 全量重写（可选）

- [x] **T3-06-01** Admin UI Tailwind 化  
  - **替换**：`src/admin/style.css`（~1100 行手写 CSS）→ utility-first，统一 `theme.css`  
  - **范围**：渠道侧栏、表单、toggle、MCP chips；视觉可焕新，行为不变  
  - **验收**：`/admin.html` 鉴权、编辑、保存与现网一致；CSS 行数显著下降（2026-05-29；~1138→~340 行）

---

## T3-07 遗留清理

- [x] **T3-07-01** 删除遗留静态  
  - **删除**：`public/js/ai-*.js`、`settings.js`、`navbar.js`、`public/css/ai-*.css`、`styles.css`  
  - **前提**：五页均已 Vite 切流；grep 零引用  
  - **验收**：`pnpm start` 无 404；无 HTML 引用上述路径（2026-06-01）

- [x] **T3-07-02** 更新 ROADMAP  
  - **改动**：Web UI 块改为 `frontend/` SSOT  
  - **验收**：与任务书目录一致（2026-06-01）

- [x] **T3-07-03** 总验收  
  - **勾选**：上文「完成检查」全部项  
  - **验收**：契约表手工通过（2026-06-01）

---

## 完成检查

- [x] 五页 `/index.html` `/admin.html` `/ai.html` `/settings.html` `/info.html` 可用；契约表手工通过（2026-06-01）
- [x] 无页依赖 `public/js/ai-ui.js`（2026-05-29）
- [x] `pnpm build` 含 `build:frontend`（2026-06-01）
- [x] 旧 `public/js`、`public/css` 遗留已删（2026-06-01）

---

## PR 切片

| PR | 内容 |
|----|------|
| PR-1 | T3-02 + T3-03 |
| PR-2a | T3-04-00～04 |
| PR-2b | T3-04-05～06（G3） |
| PR-2c1 | T3-04-07～08 |
| PR-2c2 | T3-04-09～11 |
| **PR-2d** | **仅 T3-04-12**（G4） |
| PR-3 | T3-05 + T3-06 |
| PR-4 | T3-07 |

**新页面**：`frontend/{page}.html` → `src/{page}/` → `vite.config.ts` input 加一行 → `pnpm start` 验收。

---

## 依赖关系

| 来源 | 说明 |
|------|------|
| T2 Admin | `public/admin.html` ← `src/admin/` |
| P1+ | 前端改动进 `frontend/src/{page}/`；chat 相关须 T3-04 后或同步 |
