# MCP-Client 改造进度跟踪

本目录存放 Agent Harness 改造路线图，依据：

- [Learn Claude Code 系列索引](./REFERENCES.md)（s01–s19 完整 URL 见该文件）
- 本项目现有代码结构（`src/core/`、`src/providers/`、`public/` 等）
- 2026 年 MCP / Agent Client 行业共识（Harness 与控制面分离、OAuth、上下文预算、可观测性）

## 文件说明

| 文件 | 内容 |
|------|------|
| [REFERENCES.md](./REFERENCES.md) | **外部参考索引**（s01–s19 完整网页路径） |
| [ROADMAP.md](./ROADMAP.md) | 总览：阶段划分、依赖、目标架构 |
| [P0-core-harness.md](./P0-core-harness.md) | **P0** 核心 Harness（必须先做） |
| [P1-control-plane.md](./P1-control-plane.md) | **P1** 控制面（权限、压缩、恢复、Prompt 流水线） |
| [P2-mcp-platform.md](./P2-mcp-platform.md) | **P2** MCP 平台化（Resources/Prompts/OAuth/连接治理） |
| [P3-agent-runtime.md](./P3-agent-runtime.md) | **P3** Agent 运行时进阶（规划、Memory、Hook、任务系统） |
| [BACKLOG.md](./BACKLOG.md) | 远期可选（多 Agent、Worktree、CLI/SDK） |
| [T0-architecture.md](./T0-architecture.md) | **T0** 个人任务：本文件主题为「目录与命名架构整理」 |
| [T1-channel-bus.md](./T1-channel-bus.md) | **T1** 个人任务：渠道层 + 消息总线（Web + 飞书 + 钉钉） |
| [T2-config-plane.md](./T2-config-plane.md) | **T2** 个人任务：配置平面 + 管理员平台（多渠道能力隔离） |
| [T3-frontend-modernization.md](./T3-frontend-modernization.md) | **T3** 个人任务：遗留 Web UI 全面现代化（Vite + Tailwind · 功能等价） |
| [T4-account-session.md](./T4-account-session.md) | **T4** 个人任务：用户账号 + Web 会话持久化 |

> AI 改造任务：启用项目 Skill `.cursor/skills/roadmap/`（薄路由，正文以本目录为准）

**进度唯一基准（SSOT）**：各 `P*-*.md` / `T*-*.md` 中带 ID 的子项（`- [ ] **P1-01-01**` 等）及该文件内「完成检查清单」。`ROADMAP.md` §七 里程碑仅为总览索引；实施中若与任务书不一致，**只以任务书为准**，并回写任务书勾选与下表数字。

## P 与 T 两套编号

| 前缀 | 含义 | 谁维护 | 示例 |
|------|------|--------|------|
| **P0–P3** | 路线图阶段：Harness / 控制面 / MCP 平台 / Agent 运行时 | 路线图 SSOT | `P1-01-11` 大结果落盘 |
| **T0、T1…** | **个人补充任务**（与 P 正交，主题任意） | 按需新建 `T{n}-*.md` | `T0-01-01`（架构）；`T1-01-01`（渠道+总线） |

约定：

- `T{n}` = 第 n 个个人任务文件/主题批次；**不等于**路线图阶段，**不限于架构**。
- 任务 ID：`T{n}-{章节}-{序号}`，如 `T0-01-01`。
- 新主题新建文件，如 `T1-frontend.md`，并在下表增加一行进度。

## 如何使用

1. **P0 → P1 → P2 → P3** 为路线图主序；**T\*** 个人任务可并行，不阻塞 P 阶段勾选
2. 完成一项后将 `- [ ]` 改为 `- [x]`，并在任务末尾补 `完成日期：YYYY-MM-DD`
3. 阻塞项在任务下追加 `> 阻塞：原因`
4. 大改前先更新 ROADMAP 中的「当前阶段」字段

## 进度统计（手动维护）

| 阶段 | 总数 | 已完成 | 进度 |
|------|------|--------|------|
| T0（架构·精简） | 5 | 5 | 100% |
| T1（渠道+总线） | 34 | 34 | 100% |
| T2（配置平面+Admin） | 24 | 24 | 100% |
| T3（前端现代化） | 31 | 31 | 100% |
| T4（账号+会话） | 28 | 25 | 89% |
| P0 | 19 | 19 | 100% |
| P1 | 30 | 30 | 100% |
| P2 | 20 | 20 | 100% |
| P3 | 31 | 12 | 39% |
| Backlog | 24 | 0 | — |

> 上表「总数/已完成」仅统计各任务书中 **带 ID 的子项**（`- **Px-yy-zz**` / `- **Tx-yy-zz**`），不含各文件末尾「完成检查清单」。每次勾选子项后同步改数字。

## 当前阶段

**P3 — Agent 运行时进阶**（主线： [P2-mcp-platform.md](./P2-mcp-platform.md) **已验收** 2026-06-04；[P3-03 Skill](./P3-agent-runtime.md) **暂缓** 2026-06-09；[P0-core-harness.md](./P0-core-harness.md) 完成检查清单仍有未勾 E2E 项）

并行 **T**： [T4-account-session.md](./T4-account-session.md)；T1/T2 **已验收**（2026-06-03）

## 相关代码入口

```
src/channels/               # T1：Web / 飞书 / 钉钉 Adapter、bootstrap、envelope-mapper
src/config-plane/           # T2：resolveProfile、快照（Web 全局偏好走前端 body，非 session override）
src/message-bus/            # T1：Inbound Queue、Worker、OutboundRouter、幂等
public/admin.html           # T3/T4-07：高级配置（Vite 构建产物，源码 frontend/src/admin/）
frontend/src/chat/          # T3：Chat ESM（storage-contract、chat-request-body）
frontend/                   # T3：单体 Vite MPA 源码（见 T3 任务书）
src/core/agent-harness/     # Harness：agent-loop、tool-call-manager、system-tools、types
src/core/memory/            # P3-02-B：Hindsight recall/retain、memory-debug
src/api/memory-debug.controller.ts  # P3-02-B-06：/api/memory/debug/*
frontend/src/chat/ui/memory-debug-modal.js  # P3-02-B-06：Recall/Reflect 调试弹窗
src/providers/              # AiProvider、ai-providers（LLM Chat）
src/api/ai.controller.ts    # 路由 /api/chat/*（T1 瘦身为入队）
src/core/mcp/               # MCPClientManager、server-connection
src/mcp-servers/            # echo、large-json、studio-product-list（独立 MCP 进程）
src/types/                  # config.types、mcp.types、api.types
src/config/feature-config.ts
frontend/src/settings/      # T3：Settings 页 ESM
frontend/src/info/          # T3：Info 页 ESM
frontend/src/landing/       # T3：Landing 页
prisma/schema.prisma            # T4：User / ChatSession / ChatMessage（待增）
src/api/user-auth.ts          # T4 统一会话鉴权（替代 admin-auth / ADMIN_API_TOKEN）
```

> T0 目录架构任务已全部完成，详见 [T0-architecture.md](./T0-architecture.md)（2026-05-26）
