# T0 — 个人任务：目录架构（精简版）

> **状态**：✅ **已全部完成**（2026-05-26）  
> **T0 说明**：`T*` 为个人补充任务轨（与 P0–P3 正交）。本文件经调研后**合并原 33 子项为 5 项**，只保留**价值/成本比最高**的目录调整。  
> **约束**：只改路径、文件名、import、scripts、文档；**不改业务逻辑**。  
> **预估**：**1.5–2.5 人日**，**1–2 个 PR**（可选第 3 PR 做类型收敛）。

---

## 调研结论（为何砍项）

| 原章节 | 决策 | 理由 |
|--------|------|------|
| T0-01～02 servers + core/mcp | **保留，合并为一项** | 最大误导源；import 面可控（api 2 处 + provider 1 包） |
| T0-03 system-tools 重命名 | **保留** | 3 文件、~5 处 import；与 P3 新工具路径一致 |
| T0-04 文件名规范 | **部分保留** | `Json-Utils .ts` **零引用**，删或改名即可；`tool-validation` 重命名价值低 **暂缓**；`tool-executor`→`tool-call-manager` **并入 T0-02 可选** |
| T0-05 层边界 bootstrap/API types | **暂缓** | `app.ts` 仅 1 行 cleanup；controller 仅 1 处 `InternalMessage`；Provider 已只 import registry — **无结构收益** |
| T0-06 拆 context-budget | **暂缓 → P1/T1** | 617 行但运行稳定；拆分是**可维护性**不是**目录语义**，且 export 面大，易引入回归 |
| T0-07 拆 types.ts | **暂缓** | 182 行，单文件仍可读；拆分为 4 文件属过度设计 |
| T0-08 拆 feature-config | **暂缓**；仅去 default export 若有 | `config.controller` 已用命名 import；拆文件无即时收益 |
| T0-09 合并 interfaces | **保留为可选项** | 仅 **4 处** import，可与 T0-03 同 PR 或下一 PR |
| T0-10 去 I 前缀 | **暂缓** | 纯风格，5 文件 ~27 处；与功能无关，单独 PR 性价比低 |
| T0-11 前端 public/js/chat | **暂缓 → 独立 T 主题** | 零后端架构价值；动态 loader 路径易白屏，测试成本高 |
| T0-12 杂项文档 | **并入验收** | ROADMAP 图在 T0-01 完成后改一次即可 |
| T0-03-02 system-tools 提升到 core | **暂缓** | 当前 3 个工具，嵌在 harness 内合理；≥5 再考虑 |

---

## 命名原则：项目用 `ai`，SDK 才用 `OpenAI`

**问题**：`openai.ts` / `OpenAIController` / `openaiService` 暗示「只支持 OpenAI」，但实际是 **多供应商 + OpenAI SDK 调 Chat Completions 兼容 API**（含 DeepSeek 等），命名确实夸张。

**分层约定**

| 层级 | 用什么名 | 示例 |
|------|----------|------|
| **npm 包 / 协议** | 保留 `openai`、`ChatCompletion*` | `import { OpenAI } from 'openai'` 仅在 provider 实现文件内 |
| **本项目模块** | **`ai` / `chat` / `llm`** | `ai-provider.ts`、`ai-providers.ts`、`ai.controller.ts` |
| **类 / 变量** | **`AiProvider`、`aiService`** | 不再 export class `OpenAI` |
| **类型（工具 schema）** | **`ChatTool`**（原 `OpenAITool`） | 注释标明「OpenAI Chat Completions 兼容格式」 |
| **MCP 工具编码** | **`ToolNameCodec`**（原 `OpenAINameCodec`） | 与厂商无关，是 `mcp__` 前缀编解码 |
| **DB / 设置** | 保留 `ProviderType.OPENAI` | 表示供应商枚举值，不是文件名 |

**路由**：已是 `/api/chat/*`，与 `ai.html` 一致；前端 `ai-core.js` 里遗留的 `/api/openai` 默认路径应改为 `/api/chat`（T0-01 一并修正）。

**迁移对照（T0-01 内完成）**

| 现路径 | 目标 |
|--------|------|
| `servers/openai.ts` | `providers/ai-provider.ts`，class `AiProvider` |
| `servers/openai-providers.ts` | `providers/ai-providers.ts`，`aiService` / `reloadAiProviders` |
| `api/openai.controller.ts` | `api/ai.controller.ts`，class `AiController` |
| `utils/openai-util.ts` | `utils/tool-name-codec.ts`，`ToolNameCodec` |
| harness `OpenAITool` 等 | `ChatTool`、`ChatFunctionDefinition`（types 内 rename） |

**不改动**：`package.json` 依赖名 `openai`、Prisma `ProviderType`、REFERENCES 里的 OpenAI 文档链接。

---

## 目标架构（T0 完成后）

```
src/
├── api/
│   ├── ai.controller.ts          # 原 openai.controller.ts
│   └── routes.ts                 # /chat、/chat/stream 等（不变）
├── app.ts
├── config/
│   ├── app.config.ts
│   └── feature-config.ts
├── types/
│   ├── config.types.ts
│   ├── mcp.types.ts              # T0-04 已完成
│   └── api.types.ts
├── lib/prisma.ts
├── services/config.service.ts
├── providers/
│   ├── ai-provider.ts            # 原 openai.ts；class AiProvider
│   └── ai-providers.ts
├── mcp-servers/
│   ├── echo-mcp.ts
│   └── large-json-mcp.ts
├── core/
│   ├── mcp/
│   │   ├── mcp-client-manager.ts
│   │   ├── server-connection.ts
│   │   └── index.ts
│   └── agent-harness/
│       ├── agent-loop.ts
│       ├── tool-call-manager.ts
│       ├── message-normalizer.ts
│       ├── loop-state.ts
│       ├── audit.ts
│       ├── tool-validation.ts
│       ├── context-budget.ts
│       ├── types.ts              # ChatTool 等
│       └── system-tools/
│           ├── system-tool-registry.ts
│           ├── read-persisted-output.ts
│           └── path-safety.ts
└── utils/
    └── tool-name-codec.ts

public/js/                        # T0 不动
```

**依赖方向（T0 要达成的边界）**

```
api → providers | core/mcp | config | types
providers → core/agent-harness | core/mcp | config
agent-harness → core/mcp | system-tools | config
system-tools → config | utils（path-safety）
mcp-servers → （独立进程，无 src 内依赖）
```

---

## 任务清单（5 项）

### T0-01 执行面目录重排 【必做】

合并原 T0-01 + T0-02 + T0-01-03 + T0-04-02。

- [x] **T0-01** 迁移并更新全仓 import / `package.json` scripts / **ai 命名**  
  - **完成日期**：2026-05-26
  - **providers/**：`openai.ts` → `ai-provider.ts`（`AiProvider`）；`openai-providers.ts` → `ai-providers.ts`（`aiService`、`reloadAiProviders`）  
  - **api/**：`openai.controller.ts` → `ai.controller.ts`（`AiController`）  
  - **utils/**：`openai-util.ts` → `tool-name-codec.ts`（`ToolNameCodec`）；harness types 中 `OpenAITool` → `ChatTool`（含 re-export 过渡可选）  
  - **public/**：`ai-core.js` 默认 `apiPath` 改为 `/api/chat`（与 routes 一致）  
  - **mcp-servers/**：`echo-MCP.ts` → `echo-mcp.ts`，`large-json-MCP.ts` → `large-json-mcp.ts`  
  - **core/mcp/**：`client.ts` → `mcp-client-manager.ts`，`server-connection.ts` 平移；`index.ts` 导出 `mcpClient`  
  - **删除** 空目录 `src/servers/`  
  - **涉及**：约 **18–22** 个 TS/JS 文件 + `package.json` + todos  
  - **验收**：`npm run build`；grep 无自研代码路径/类名 `openai-provider`、`OpenAIController`、class `OpenAI`（`from 'openai'` 除外）  
  - **估时**：1–1.5 人日

---

### T0-02 Harness 内 system-tools 与工具管理器命名 【必做】

合并原 T0-03-01 + T0-04-03（可选部分）。

- [x] **T0-02** `agent-harness/tools/` → `system-tools/`；`tool-executor.ts` → `tool-call-manager.ts`  
  - **完成日期**：2026-05-26
  - **涉及**：3 个 system-tools 文件 + `agent-loop.ts`、`ai-provider.ts` 等 ~**6** 处 import  
  - **同步**：`todos/P3-agent-runtime.md` 中新工具路径改为 `system-tools/`  
  - **验收**：build 通过；grep 无 `agent-harness/tools`、`tool-executor`  
  - **估时**：0.25–0.5 人日（可与 T0-01 同一 PR）

---

### T0-03 死代码与违规命名清理 【必做，可极小 PR】

合并原 T0-04-01 + T0-08-01（若仍存在 default export）。

- [x] **T0-03** 清理 `utils/Json-Utils .ts`（**当前全仓零 import** → 删除或改为 `json-utils.ts`）；移除 `feature-config.ts` 的 `export default`（若仍存在）  
  - **完成日期**：2026-05-26
  - **验收**：grep 无 `Json-Utils`；无 default import FeatureConfig  
  - **估时**：0.1 人日

---

### T0-04 类型目录收敛 【可选，建议 T0-01 后单独小 PR】

合并原 T0-09 全部。

- [x] **T0-04** `interfaces/mcp.interfaces.ts` → `types/mcp.types.ts`；删 Deepseek 遗留 DTO；`ErrorResponse` 一并迁入 `types/api.types.ts` 或 `mcp.types.ts`  
  - **完成日期**：2026-05-26
  - **涉及**：**4** 处 import（`client`、`server-connection`、`info.controller` 等）  
  - **验收**：`interfaces/` 可删除；build 通过  
  - **估时**：0.25–0.5 人日

---

### T0-05 验收与文档同步 【必做】

合并原 T0-C + T0-02-02 + T0-12-03。

- [x] **T0-05** 全仓回归 + 文档  
  - `npm run build` ✅  
  - 手动：一轮流式 chat + 一次 MCP 工具调用 + 一次 system `read_persisted_output` ✅  
  - 更新 `todos/README.md` 代码入口、`ROADMAP.md` 架构图路径 ✅  
  - **完成日期**：2026-05-26

---

## 暂缓清单（不在 T0 范围）

| 项 | 建议归属 | 触发条件 |
|----|----------|----------|
| 拆 `context-budget.ts` | P1 子任务或 T1 | 单文件 >800 行或新增第 2 个落盘相关模块 |
| 拆 `agent-harness/types.ts` | T1 | 新增 SSE/Provider 类型 >5 个 |
| 拆 `feature-config.ts` | 不做，除非配置域 >5 个 | — |
| bootstrap/ 目录 | 不做 | `app.ts` 启动副作用仍 <30 行 |
| `types/agent-api.types.ts` | 不做 | API 深 import harness 仍 ≤2 处 |
| 去 `I` 前缀 | T1 或规范 PR | 大规模改 types 时顺带 |
| `public/js/chat/` | **独立 T 主题** | 前端模块化/refactor 专项 |
| `system-tools` 提升到 `core/` | T1 | 注册工具 ≥5 或出现跨 harness 复用 |
| `OpenAI` 类 → `OpenAIProvider` | **已否决** → 改为 `AiProvider`（见命名原则） |

---

## 工作量对比

| | 原 T0（33 项） | 精简 T0（5 项） |
|--|----------------|-----------------|
| 必做任务 | 28 + 4 检查 | **3** + 1 验收 |
| 可选 | 2 | **1**（类型收敛） |
| 人日 | 3–5 | **1.5–2.5** |
| PR 数 | 6–8 | **1–2**（+1 可选） |
| git diff 行 | 4k–8k | **~2.5k–3.5k** |

---

## 建议 PR 切分

1. **PR-A（推荐一次合并）**：T0-01 + T0-02 + T0-03 + T0-05  
2. **PR-B（可选）**：T0-04 类型收敛  

---

## 实施顺序

```
T0-01 执行面重排 ──┬──► T0-02 system-tools + tool-call-manager
                  ├──► T0-03 死代码清理
                  └──► T0-05 验收
T0-04（可选，独立 PR）
```
