# T5 — 前端架构收敛 + 体积优化 + Flowbite 移除

> **状态**：进行中  
> **范围**：`frontend/` 源码与构建；T3/T4 功能契约不变；不要求像素复刻  
> **包管理**：**pnpm**（禁 npm / yarn）  
> **验证**：`pnpm run build:frontend` + 浏览器手工（不引入 E2E）；改 bundle 时加 `pnpm run analyze:frontend`  
> **前置**：T3 已验收、[`docs/frontend-audit-2026.md`](../docs/frontend-audit-2026.md)  
> **Agent Skill**：[`.cursor/skills/frontend-refactor/SKILL.md`](../.cursor/skills/frontend-refactor/SKILL.md)

---

## 目录（SSOT）

```
frontend/
├── vite.config.ts
├── vite.analyze.config.ts
├── index.html | admin.html | ai.html | settings.html | info.html
└── src/
    ├── shared/                 # theme · navbar · fetch-json · ui/
    ├── auth/
    ├── landing/ | admin/ | settings/ | info/
    └── chat/                   # 仅 ai 页；他页禁止 import chat/

构建：pnpm run build:frontend
分析：pnpm run analyze:frontend  →  docs/stats.html
```

根目录 `*.html` = 入口；`src/{page}/` = 实现。命名路线图见 §设计定稿。

---

## 设计定稿

| 主题 | 决策 |
|------|------|
| UI 库 | 移除 Flowbite；全站 SSOT 为 `shared/ui/` 自研原语 |
| Modal | 大模态：`overlay-modal.js`；确认框：`confirm-dialog.js`（由 `modal.js` 迁移） |
| 体积 | CSS 优先（去 Flowbite plugin → 收窄 `@source`）；JS 次之（markdown/modal lazy） |
| 架构 | 继续 Vanilla ESM + MPA；不引 React/Vue |
| 安全 | **一子项一 PR**；CSS/JS 分流；@source 单页单 PR；失败整 PR revert |

### 功能契约（不可破坏 — 同 T3）

| 契约 | 验证 |
|------|------|
| `localStorage` `aiChatSettings` | chat 设置改项 → 刷新仍生效 |
| `aiCompactBaseline:{sessionId}` | 压缩态保留 |
| IDB `AIChatDatabase` | guest 旧会话可读 |
| SSE | 发消息、停生成、tool 卡片 |
| 请求体 | 对照 `normalize-web-inbound` |
| guest/authed | T4 双模式正常 |

### 文件 rename 路线图（未到对应子项禁止改）

| 现名 | 目标名 | 子项 |
|------|--------|------|
| `shared/ui/modal.js` | `confirm-dialog.js` | T5-03-02 |
| `shared/ui/flowbite-overrides.css` | `ui-primitives.css` | T5-03-05 |
| `shared/flowbite.css` | **删除** | T5-03-05 |
| `chat/core.js` | `app-core.js` | T5-06-01 |
| `chat/data.js` | `session-data.js` | T5-06-01 |
| `chat/api.js` | `chat-api.js` | T5-06-01 |
| `chat/ui/modal-host.js` | `chat-modals-host.js` | T5-06-02 |

**禁止命名**：`utils.js` / `helpers.js`；新 `flowbite-*`；`modal.js` 同时表示大模态与确认框。

### Agent 铁律（编码前必读）

| # | 规则 |
|---|------|
| A1 | 一 `T5-xx-yy` 一 PR |
| A2 | 删 `flowbite.css`（T5-03-05）不得同批改 `toast.js` / `dropdown-select.js` |
| A3 | T5-05 每次只改 **一个** `{page}/style.css` |
| A4 | T5-03～05 期间 `fb-*` / `ui-*` / `chat-modal-*` class **名** 只增不删 |
| A5 | rename 先 shim re-export，再改 import，再删旧文件 |
| A6 | lazy 不改 `createChatApp` 对外行为 |
| A7 | 验收失败 → revert 整 PR，禁止叠补丁 |

---

## 开发顺序

`T5-01`（部分 ✓）→ ~~`T5-02`（跳过）~~ → `T5-03`（**G6**，03-01→03-06 顺序不可乱）→ `T5-04`（**G7**）→ `T5-05`（**G8**，05-05 chat 最后）→ `T5-06` → `T5-07`

| 门禁 | 关闭条件 | 阻塞 |
|------|----------|------|
| **G5** | T5-01 完成 | T5-03～07 |
| **G6** | T5-03-06 | T5-05、T5-07 终验 |
| **G7** | T5-04-02 | T5-06-02（chat UI rename） |
| **G8** | T5-05-05 | T5-07 体积终验 |

**禁止顺序**

- T5-03-05 早于 T5-03-01～04（会先删 CSS 再断 JS → 全站样式/交互崩）
- T5-05 早于 T5-03（Flowbite plugin 与 @source 交织，难归因）
- T5-06 rename 与 T5-04-02 同 PR

---

## T5-01 基线与度量 — **G5**

> 调查报告与 analyze 脚本已于 2026-06-15 落地。

- [x] **T5-01-01** 调查报告 [`docs/frontend-audit-2026.md`](../docs/frontend-audit-2026.md)（2026-06-15）
- [x] **T5-01-02** `rollup-plugin-visualizer` + `frontend/vite.analyze.config.ts` + `pnpm run analyze:frontend` → `docs/stats.html`（2026-06-15）
- [ ] **T5-01-03** 终验前同步报告 §6.4 与 `public/ai.html` 引用 hash；T5-07-01 再写对比数字  
  - **验收**：`pnpm run build:frontend` 后 hash 与文档一致

---

## T5-02 本地开发 — **已关闭**

> **跳过**（2026-06-16）：习惯 `pnpm run build:frontend` 全量构建验证，不引入 `dev:frontend` HMR 流程。

- [x] **T5-02-01** ~~`package.json` 增加 `"dev:frontend"`~~ — **关闭**，不实施（2026-06-16）  
  - **验收**：`pnpm run build:frontend` + 浏览器手工（同 T5 总体验证）

---

## T5-03 移除 Flowbite — **G6**

> **方针**：JS 逐个替换 → **最后** 删 CSS plugin 与 npm 包。  
> `fb-*` class 名保留在 `ui-primitives.css`，本阶段只改实现与文件路径。

```
03-01 toast → 03-02 confirm → 03-03 dropdown → 03-04 JS 审计 → 03-05 CSS+依赖 → 03-06 G6 终验
```

- [x] **T5-03-01** Toast 去 Flowbite（2026-06-16）  
  - **改动**：`shared/ui/toast.js` 删 `import { Dismiss } from 'flowbite'`；关闭用 `remove()` + 现有 `setTimeout`  
  - **不动**：`showToast(message, variant, durationMs)`；`fb-toast-*` class  
  - **禁止**：本 PR 动 `post-tailwind.css` / `flowbite.css`  
  - **验收**：`pnpm run build:frontend`；五页各触发 toast 一次

- [x] **T5-03-02** 确认框 → `confirm-dialog.js`（2026-06-16）  
  - **改动**：新建 `confirm-dialog.js`（DOM + `fb-confirm-*`，无 Flowbite `Modal`）；`modal.js` 暂 shim re-export  
  - **消费方**：`info/app.js`、`settings/app.js`、`chat/ui/history-modal.js`、`chat/ui/quickmessage.js`  
  - **下一 PR 或同 PR（diff<150 行）**：改 import 路径；删 `modal.js`  
  - **禁止**：改 `confirmModal` 返回 `Promise<boolean>` 语义  
  - **验收**：删提供商 / 删服务器 / 删会话 / 删快捷消息 — 确认与取消正常

- [x] **T5-03-03** 下拉自研（2026-06-16）  
  - **改动**：`dropdown-select.js` 自研开闭与键盘（可参考 `tooltip.js`；禁 Popper 新依赖）  
  - **不动**：`mountDropdownSelect` / `mountDropdownSelectsIn` / `refreshDropdownSelect` 签名  
  - **禁止**：本 PR 删 `flowbite.css`  
  - **验收**：admin / settings / chat 设置与快捷消息下拉；`config-fetch` refresh 正常

- [x] **T5-03-04** JS 零 Flowbite 引用（2026-06-16）  
  - **改动**：`grep -r "from 'flowbite'" frontend/src` 为零；`modal.js` shim 已删  
  - **验收**：`pnpm run build:frontend`；`navbar-*.js` gzip 较基线下降

- [x] **T5-03-05** 删 Flowbite CSS 与 npm 依赖 — **仅本 PR 动 CSS 聚合**（2026-06-16）  
  - **改动**：  
    1. `post-tailwind.css` 去掉 `@import './flowbite.css'`  
    2. 删 `shared/flowbite.css`  
    3. `flowbite-overrides.css` → `ui-primitives.css`（class 名不变）  
    4. `package.json` 删 `flowbite`；`pnpm install`  
  - **禁止**：顺手做 T5-05 `@source`  
  - **验收**：五页目视无裸 HTML；ai CSS gzip 较基线 36.6 KB 下降

- [x] **T5-03-06** **G6 关闭** — Flowbite 终验（2026-06-16）  
  - **验收**：`grep -ri flowbite frontend/` 为零；`pnpm dlx knip --reporter compact` 无 flowbite；§功能契约五页抽查

---

## T5-04 JS 延迟加载 — **G7**

> **方针**：markdown 栈与 chat 模态拆独立 chunk；**async 边界**集中在生命周期预热与用户打开模态。  
> **架构（定稿）**：`markdown-stack.js` 门面 + `markdown-stack.bundle.js` chunk；`app.init` 预热；模态 `createLazyModalLoader`。

### 三层模型

| 层 | 职责 | async |
|----|------|-------|
| **markdown 门面** | `warmMarkdownStack` / `parseMarkdown` / `enhanceCodeBlocks` | 仅 warm |
| **生命周期** | `core.init` → `await warmMarkdownStack()` | init 一处 |
| **模态** | `showXxx` → `import('./xxx-modal.js')` | show 边界 |

**禁止**：UI 热路径（SSE、`renderConversation`）直接 `import('markdown-stack.bundle')`；`renderers.js` 承载 markdown 加载；未 warm 时静默纯文本兜底。

- [x] **T5-04-01** JS lazy — markdown 栈 + 7 模态（2026-06-16）  
  - **改动**：`markdown-stack.bundle.js`（marked + hljs）；`renderers` 曾用 dynamic import；`minimal-ui` `createLazyModalLoader` 懒加载 memory-debug / system-tools / compact / mcp / quickmessage / history / settings  
  - **禁止**：改渲染 HTML 结构  
  - **验收**：独立 `markdown-stack-*.js` + 各 modal chunk；ai 入口 JS gzip 较 T5-03 再降；首条 AI 消息 Markdown/高亮正常；全模态开/关/保存

- [x] **T5-04-02** Markdown 门面 + init 预热（**G7 关闭**，2026-06-16）  
  - **改动**：  
    1. `markdown-stack.js` — `warmMarkdownStack()` + 同步 `parseMarkdown` / `enhanceCodeBlocks`（未 warm → throw）  
    2. `core.init` — `await warmMarkdownStack()`（在 `isConfigLoaded` 之前）  
    3. 收回热路径 async：`minimal-ui`、`stream-handler`、`api`、`data`、`renderers`；compact/history 改调门面  
    4. 删 `renderers.ensureMarkdownStack`；删 `code-blocks.js`（逻辑并入 `markdown-stack.js`）  
  - **不动**：modal lazy 与 `createChatApp` 对外行为  
  - **验收**：`pnpm run build:frontend`；`pnpm exec tsc --noEmit`；§功能契约 chat P0 自测（流式/非流式、历史模态、compact 预览、init 后立即发消息）

---

## T5-05 收窄 Tailwind `@source` — **G8**

> **高风险**：purge 误删 HTML 字符串内 class（尤其 `modal-host.js`、`tool-cards.js`）→ 整页布局塌。  
> **铁律**：一子项一 PR；顺序 **landing → settings → info → admin → chat**。

**每 PR 步骤**

1. 备份该页 `style.css` 的 `@source`  
2. 去掉 `@source '../../shared/**/*.js'`，改为 `@source '../shared/ui/**/*.js'` + 本页 `src/{page}/**` + 显式列出非 ui 的 shared import（如 `navbar.js`）  
3. `pnpm run build:frontend` → 对比该页 CSS gzip  
4. 目视该页全部交互  
5. 失败 → revert 整 PR

- [ ] **T5-05-01** `landing/style.css` — `/` 导航与 navbar  
- [ ] **T5-05-02** `settings/style.css` — CRUD、dropdown、confirm、toast  
- [ ] **T5-05-03** `info/style.css` — 服务器 Tab、OAuth、RP 面板  
- [ ] **T5-05-04** `admin/style.css` — 两 Tab、dropdown、toggle  
- [ ] **T5-05-05** `chat/style.css` — **必须最后**；须覆盖 `modal-host`、`tool-cards`、`renderers`、`icons` 等 js  
  - **验收**：chat 全交互 + SSE；**G8 关闭**

---

## T5-06 结构与命名

> 须在 **G6+G7** 后；与体积正交。单 PR diff ≤300 行；rename 用 shim（§A5）。

- [ ] **T5-06-01** 核心模块 rename（可拆 3 PR）  
  - **改动**：`core.js`→`app-core.js`、`data.js`→`session-data.js`、`api.js`→`chat-api.js`  
  - **不动**：`createChatApp` / `createChatData` / `createChatApi` 导出名  
  - **验收**：每 PR 后 `pnpm run build:frontend` + chat SSE 冒烟

- [ ] **T5-06-02** Chat UI rename  
  - **改动**：`modal-host.js`→`chat-modals-host.js`；（可选）`minimal-ui.js`→`chat-shell-ui.js`  
  - **验收**：全部 chat 模态与工具栏

- [ ] **T5-06-03** `app-core.js` 瘦身  
  - **改动**：外迁事件绑定 / `init*` 至 `chat/app-lifecycle.js`（≤300 行/PR）  
  - **禁止**：改 `app.state` 字段名  
  - **验收**：`app-core.js` <450 行；行为不变

- [ ] **T5-06-04** 大文件切片  
  - **改动**：`session-data.js` / `quickmessage.js` 按职责拆分（≤300 行/PR）  
  - **验收**：IDB 契约；快捷消息 CRUD

---

## T5-07 终验

- [ ] **T5-07-01** 更新 [`docs/frontend-audit-2026.md`](../docs/frontend-audit-2026.md) §6.4 体积对比；勾选 T5-01-03  
  - **验收**：数字来自 `pnpm run build:frontend` 终端 gzip 行

- [ ] **T5-07-02** 总验收  
  - **勾选**：下文「完成检查」全部项  
  - **验收**：ai 首屏 gzip ≤110 KB 或 PR 记录差距；`todos/README.md` 进度同步

---

## 完成检查

- [ ] `grep -ri flowbite frontend/` 为零
- [ ] 五页 + chat §功能契约手工通过
- [ ] ai CSS gzip 较基线降 ≥25%，或 ai 首屏合计 gzip ≤110 KB
- [ ] §命名 SSOT 与仓库一致（或 shim 已列于 §设计定稿）
- [ ] G5～G8 全部关闭

---

## PR 切片

| PR | 内容 |
|----|------|
| ~~PR-1~~ | ~~T5-02-01~~（跳过） |
| PR-1 | T5-03-01 |
| PR-2 | T5-03-02 |
| PR-3 | T5-03-03 |
| PR-4 | T5-03-04 |
| PR-5 | T5-03-05 + T5-03-06（**高**，CSS） |
| PR-6 | T5-04-01（markdown + 7 modal lazy） |
| PR-7 | T5-04-02（**G7 关闭**） |
| PR-8 | T5-05-01 |
| PR-9 | T5-05-02 |
| PR-10 | T5-05-03 |
| PR-11 | T5-05-04 |
| PR-12 | T5-05-05（**高**） |
| PR-13+ | T5-06-xx |
| PR-final | T5-07 |

**禁止 PR 组合**：T5-03-05 + T5-05-xx；T5-06 + T5-04-02。

---

## 回归失败速查

| 症状 | 优先怀疑 | 动作 |
|------|----------|------|
| 全站无 Tailwind | `@import 'tailwindcss'` 顺序错 | 对照 landing `style.css` 模板 |
| 单页布局塌 | 该页 `@source` 过窄 | revert 对应 T5-05-xx |
| 下拉/确认/toast 失效 | T5-03-05 早于 03-01～04 | 检查 03 顺序 |
| chat 白屏 | rename 断 import / lazy 未 mount | console；恢复 shim |
| Markdown 纯文本 / throw | T5-04-02 warm 未完成或漏调 | 查 `core.init` 与 `warmMarkdownStack` |
| `querySelector is not a function` | 把 Promise 当 DOM | 热路径勿 await 已同步的 UI 方法 |

---

## 依赖关系

| 来源 | 说明 |
|------|------|
| T3 | MPA、§功能契约、chat 隔离 |
| T4 | guest/authed、`auth-shell` toast |
| [`docs/frontend-audit-2026.md`](../docs/frontend-audit-2026.md) | 体积基线与调查结论 |
| [frontend-refactor Skill](../.cursor/skills/frontend-refactor/SKILL.md) | Phase B/C/D 拆分细则 |
