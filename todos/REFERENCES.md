# 参考文档索引

本文件集中维护外部参考链接，供 **评审门禁** 与开发直接引用。**优先使用完整 URL，避免仅写 s01、s02 等缩写。**

> 评审改造任务时：先读本文件对应主题链接，再对照 `todos/P*-*.md` 任务验收标准。

---

## Learn Claude Code 系列（ShareAI）

> 站点：https://learn.shareai.run/zh/  
> URL 规则：`https://learn.shareai.run/zh/s{NN}/`（两位编号，如 s01、s19）  
> 与本仓库 P0–P3 任务映射最密，**评审 Harness / 控制面任务时优先读**。

| 章节 | 标题 | 完整 URL |
|------|------|----------|
| s01 | Agent Loop（主循环） | https://learn.shareai.run/zh/s01/ |
| s02 | Tool Use（工具路由与分发） | https://learn.shareai.run/zh/s02/ |
| s03 | Planning / Todo（会话内规划） | https://learn.shareai.run/zh/s03/ |
| s04 | Subagent（子 Agent 上下文隔离） | https://learn.shareai.run/zh/s04/ |
| s05 | Skills（按需加载知识包） | https://learn.shareai.run/zh/s05/ |
| s06 | Context Compact（上下文压缩） | https://learn.shareai.run/zh/s06/ |
| s07 | Permission（权限门） | https://learn.shareai.run/zh/s07/ |
| s08 | Hook（生命周期扩展点） | https://learn.shareai.run/zh/s08/ |
| s09 | Memory（跨会话记忆） | https://learn.shareai.run/zh/s09/ |
| s10 | System Prompt Pipeline（Prompt 组装流水线） | https://learn.shareai.run/zh/s10/ |
| s11 | Error Recovery（错误分类与恢复） | https://learn.shareai.run/zh/s11/ |
| s12 | Task System（持久任务图） | https://learn.shareai.run/zh/s12/ |
| s13 | Background Tasks（后台执行槽位） | https://learn.shareai.run/zh/s13/ |
| s14 | Cron Scheduler（定时调度） | https://learn.shareai.run/zh/s14/ |
| s15 | Teammate（长期队友） | https://learn.shareai.run/zh/s15/ |
| s16 | Team Protocol（团队结构化协议） | https://learn.shareai.run/zh/s16/ |
| s17 | Autonomous Agents（自治认领） | https://learn.shareai.run/zh/s17/ |
| s18 | Worktree（任务隔离执行车道） | https://learn.shareai.run/zh/s18/ |
| s19 | MCP（外部能力接入） | https://learn.shareai.run/zh/s19/ |

### 英文版（部分章节中文页加载慢时备用）

| 章节 | 完整 URL |
|------|----------|
| s11 | https://learn.shareai.run/en/s11/ |

### 源码仓库

- https://github.com/shareAI-lab/learn-claude-code

---

## Harness 架构与 Agent 工程（2026 共识）

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| LangChain — Agent Harness 解剖 | Agent = Model + Harness；编排、压缩、子 Agent | https://www.langchain.com/blog/the-anatomy-of-an-agent-harness |
| LangChain — Deep Agents Harness | 规划、虚拟 FS、子 Agent、Human-in-the-loop | https://docs.langchain.com/oss/python/deepagents/harness |
| LangChain — Agents（ReAct 循环） | 工具循环基础模式 | https://docs.langchain.com/oss/python/langchain/agents |
| LangGraph 概览 |  durable 执行、持久化、流式编排运行时 | https://docs.langchain.com/oss/python/langgraph/overview |
| OpenAI Agents SDK — Agents | 官方 Agent 定义、handoff、工具 | https://openai.github.io/openai-agents-python/agents/ |
| OpenAI Agents SDK — 多 Agent 编排 | 编排与协作模式 | https://openai.github.io/openai-agents-python/multi_agent/ |
| OpenAI Agents SDK — Sandbox / Harness | 隔离执行、Harness 控制面（2026） | https://openai.github.io/openai-agents-python/sandbox_agents/ |
| NVIDIA Elements — Agent Harness 指南 | Prompt / Context / Harness 三层；项目 Harness 投资点 | https://nvidia.github.io/elements/docs/internal/guidelines/agent-harness/ |
| Innobu — Agentic Harness Engineering | 2026 Harness 框架与合规（EU AI Act） | https://www.innobu.com/en/agentic-harness-engineering.html |
| NxCode — Harness Engineering 指南 | 企业 Inner/Outer Harness 分层 | https://www.nxcode.io/resources/news/what-is-harness-engineering-complete-guide-2026 |

---

## LLM API · Tool Use · 消息格式

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| OpenAI — Function / Tool calling | Chat Completions 工具调用、tool 消息回写 | https://developers.openai.com/api/docs/guides/function-calling |
| OpenAI — Using tools | 内置工具、MCP、Remote tools | https://platform.openai.com/docs/guides/tools |
| OpenAI — Chat Completions API | messages 结构、stream、usage | https://developers.openai.com/api/docs/api-reference/chat |
| OpenAI Cookbook — 多轮 function call | 经典 agent loop 示例 | https://developers.openai.com/cookbook/examples/how_to_call_functions_with_chat_models |
| Anthropic — Tool use 总览 | tool_use / tool_result 块、客户端执行模型 | https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/overview |
| Anthropic — Tool use 工作原理 | 消息交替、配对约束 | https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works |
| Anthropic — 定义与实现工具 | input_schema、strict、最佳实践 | https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use |
| Anthropic — Messages API | 消息 API 参考 | https://docs.anthropic.com/en/api/messages |

---

## MCP 生态

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| MCP 规范站点 | 官方入口、概念、版本 | https://modelcontextprotocol.io/ |
| MCP 规范 Schema（2025-11-25） | JSON Schema 源码 SSOT | https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2025-11-25/schema.ts |
| MCP TypeScript SDK（V1，本仓库使用） | `@modelcontextprotocol/sdk` | https://github.com/modelcontextprotocol/typescript-sdk |
| MCP TypeScript SDK 文档 | Tools / Resources / Prompts / Transport | https://ts.sdk.modelcontextprotocol.io/ |
| MCP TypeScript SDK V2（预览） | 模块化 server/client 包 | https://ts.sdk.modelcontextprotocol.io/v2/ |
| AWS — MCP Strategies | 生产 MCP：OAuth、workflow-scoped、上下文预算 | https://docs.aws.amazon.com/prescriptive-guidance/latest/mcp-strategies/introduction.html |
| mcp-use — Agent 概览 | MCP + LLM Agent 集成框架 | https://www.mintlify.com/mcp-use/mcp-use/typescript/agent/overview |
| mcp-use — Conversation Memory | 完整 history（含 tool_calls / tool_result） | https://www.mintlify.com/mcp-use/mcp-use/typescript/agent/memory |
| mcp-use — 架构 | Client / Agent / MCP Server 分层 | https://mcp-use.com/docs/typescript/concepts/architecture |

---

## Agent Client · IDE · 上下文传递

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| GitHub Copilot — MCP 概念 | Copilot 中的 MCP 与上下文 | https://docs.github.com/en/copilot/concepts/context/mcp |
| GitHub Copilot — Coding Agent 接 MCP | Cloud agent 配置 MCP Server | https://docs.github.com/en/copilot/customizing-copilot/extending-copilot-coding-agent-with-mcp |
| GitHub Copilot — Context passing | Agent 扩展的完整上下文图传递 | https://docs.github.com/en/copilot/how-tos/use-copilot-extensions/build-a-copilot-agent/use-context-passing |
| GitHub Copilot — Custom agents | Markdown/YAML 定义 Agent 与工具 | https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents |
| Vercel AI SDK — Agents 概览 | ToolLoopAgent、多步工具循环 | https://sdk.vercel.ai/docs/agents/overview |
| Vercel AI SDK — Loop Control | stopWhen、prepareStep、步数上限 | https://sdk.vercel.ai/docs/agents/loop-control |
| Vercel AI SDK — ToolLoopAgent API | TypeScript Agent 循环参考 | https://sdk.vercel.ai/docs/reference/ai-sdk-core/tool-loop-agent |
| OpenAI Codex — AGENTS.md 指南 | 分层 AGENTS.md、项目指令 | https://developers.openai.com/codex/guides/agents-md |
| AGENTS.md 开放标准 | 跨工具项目指令约定（README for agents） | https://agents.md/ |
| AGENTS.md 规范仓库 | 格式与生态 | https://github.com/agentsmd/agents.md |

---

## 上下文 · 压缩 · 可观测性

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| Chroma — Context Rot 研究 | 上下文窗口填充与推理退化 | https://research.trychroma.com/context-rot |
| Stanza — MCP LLM-Driven Tool Use | MCP Client 侧 agent loop 模式 | https://www.stanza.dev/courses/mcp-clients/tool-invocation/mcp-clients-llm-driven-tool-use |
| MCP Playground — Agent + MCP 入门 | 2026 Agent/MCP 概念综述 | https://mcpplaygroundonline.com/blog/ai-agent-mcp-explained |

---

## 本仓库改造路线文件

| 文件 | 路径 |
|------|------|
| 总路线图 | [todos/ROADMAP.md](./ROADMAP.md) |
| P0 核心 Harness | [todos/P0-core-harness.md](./P0-core-harness.md) |
| P1 控制面 | [todos/P1-control-plane.md](./P1-control-plane.md) |
| P2 MCP 平台化 | [todos/P2-mcp-platform.md](./P2-mcp-platform.md) |
| P3 Agent 运行时 | [todos/P3-agent-runtime.md](./P3-agent-runtime.md) |
| 远期 Backlog | [todos/BACKLOG.md](./BACKLOG.md) |

---

## 评审门禁快速索引（任务 → 先读哪些）

| 改造主题 | 建议先读 |
|----------|----------|
| Agent Loop / Harness 拆分 | ShareAI s01、s02 + LangChain Harness 解剖 + OpenAI Agents SDK |
| 消息规范化 / tool 配对 | ShareAI s02 + Anthropic Tool use + OpenAI Function calling |
| 完整历史链 / context graph | mcp-use Memory + Copilot Context passing + ShareAI s09 |
| 上下文压缩 | ShareAI s06 + Chroma Context Rot + LangChain Deep Agents |
| 错误恢复 | ShareAI s11（英文备用）+ AWS MCP Strategies |
| 权限门 | ShareAI s07 + AWS MCP Strategies |
| MCP 平台化 | ShareAI s19 + MCP 规范 + TS SDK 文档 |
| 多步 Agent / 循环上限 | Vercel Loop Control + OpenAI Agents orchestration |
