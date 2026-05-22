# MCP-Client 改造进度跟踪

本目录存放 Agent Harness 改造路线图，依据：

- [Learn Claude Code 系列索引](./REFERENCES.md)（s01–s19 完整 URL 见该文件）
- 本项目现有代码结构（`src/core/`、`src/servers/openai.ts`、`public/` 等）
- 2026 年 MCP / Agent Client 行业共识（Harness 与控制面分离、OAuth、上下文预算、可观测性）

## 文件说明

| 文件 | 内容 |
|------|------|
| [REFERENCES.md](./REFERENCES.md) | **外部参考索引**（s01–s19 完整网页路径） |
| [ROADMAP.md](./ROADMAP.md) | 总览：阶段划分、依赖关系、目标架构 |
| [P0-core-harness.md](./P0-core-harness.md) | **P0** 核心 Harness（必须先做） |
| [P1-control-plane.md](./P1-control-plane.md) | **P1** 控制面（权限、压缩、恢复、Prompt 流水线） |
| [P2-mcp-platform.md](./P2-mcp-platform.md) | **P2** MCP 平台化（Resources/Prompts/OAuth/连接治理） |
| [P3-agent-runtime.md](./P3-agent-runtime.md) | **P3** Agent 运行时进阶（规划、Memory、Hook、任务系统） |
| [BACKLOG.md](./BACKLOG.md) | 远期可选（多 Agent、Worktree、CLI/SDK） |

> AI 改造任务：启用项目 Skill `.cursor/skills/roadmap/`（薄路由，正文以本目录为准）

## 如何使用

1. 按 **P0 → P1 → P2 → P3** 顺序推进，同阶段内任务可并行
2. 完成一项后将 `- [ ]` 改为 `- [x]`，并在任务末尾补 `完成日期：YYYY-MM-DD`
3. 阻塞项在任务下追加 `> 阻塞：原因`
4. 大改前先更新 ROADMAP 中的「当前阶段」字段

## 进度统计（手动维护）

| 阶段 | 总数 | 已完成 | 进度 |
|------|------|--------|------|
| P0 | 19 | 19 | 100% |
| P1 | 26 | 0 | 0% |
| P2 | 21 | 0 | 0% |
| P3 | 26 | 0 | 0% |
| Backlog | 24 | 0 | — |

> 每次勾选任务后，同步更新上表数字。

## 当前阶段

**P0 — 核心 Harness 加固**（任务项已全部完成；待勾：P0 完成检查清单 + README Harness 架构说明）

## 相关代码入口

```
src/core/agent-harness/  # Harness：agent-loop、tool-executor、message-normalizer、types
src/servers/openai.ts      # Provider 层（chat / chatStream 入口）
src/servers/openai-providers.ts  # 多提供商实例注册
src/core/client.ts         # MCPClientManager 多服聚合
src/core/server-connection.ts  # 单服连接、callTool、重连
src/config/feature-config.ts # 特性开关（历史、工具、校验）
public/js/ai-*.js          # 前端会话与 SSE 消费
prisma/schema.prisma       # 持久化 Schema
```
