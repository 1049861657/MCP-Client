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
| Claude Code — Tools Reference | Harness 内置 Read；大输出落盘 + 读回 | https://code.claude.com/docs/en/tools-reference |
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

## 渠道层 · 消息总线

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| BullMQ 官方文档 | Queue / Worker / 重试 / 生产配置 | https://docs.bullmq.io/ |
| BullMQ — ioredis 连接 | `maxRetriesPerRequest: null` 等约束 | https://docs.bullmq.io/guide/connections |
| ioredis | Node Redis 客户端（BullMQ 底层） | https://github.com/redis/ioredis |
| Redis Streams — LLM 流式输出 | Stream 推浏览器（模式参考） | https://redis.io/tutorials/howtos/solutions/streams/streaming-llm-output/ |
| CloudEvents 规范 | Envelope 字段约定（id / source / type / time） | https://github.com/cloudevents/spec |
| EIP — Channel Adapter | 渠道适配器模式 | https://www.enterpriseintegrationpatterns.com/patterns/messaging/ChannelAdapter.html |
| EIP — Message Broker | 消息总线 / 解耦模式 | https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageBroker.html |
| MessagingGateway — ARCHITECTURE | Ports：Inbound / Messaging / Connection | https://github.com/vgpastor/MessagingGateway/blob/main/ARCHITECTURE.md |
| MessagingGateway 仓库 | 统一 API + EventBus 参考实现 | https://github.com/vgpastor/MessagingGateway |
| OpenClaw — Channel Plugin 开发 | ChannelAdapter 接口与扩展机制 | https://www.openclawbook.xyz/en/ch13-channel-extension-mechanism/13.4-developing-custom-extensions |
| OpenClaw 仓库 | 多渠道 Gateway 参考实现 | https://github.com/openclaw/openclaw |
| unified-channel-js | 多 Channel Adapter 中间件 | https://github.com/gambletan/unified-channel-js |
| Hermes Agent — DingTalk | Stream Mode 接入模式参考 | https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/messaging/dingtalk.md |
| 飞书 Node SDK | `@larksuiteoapi/node-sdk` | https://github.com/larksuite/node-sdk |
| 飞书 npm | `@larksuiteoapi/node-sdk` | https://www.npmjs.com/package/@larksuiteoapi/node-sdk |
| 飞书 — 长连接接收事件 | 3s ACK、集群推送、至少一次投递 | https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/event-subscription-guide/long-connection-mode |
| 飞书 — 事件概述 | 有序事件、重复消息说明 | https://open.feishu.cn/document/ukTMukTMukTM/uUTNz4SN1MjL1UzM |
| 钉钉 Stream SDK | `dingtalk-stream` Node 官方包 | https://github.com/open-dingtalk/dingtalk-stream-sdk-nodejs |
| 钉钉 npm | `dingtalk-stream` | https://www.npmjs.com/package/dingtalk-stream |
| 钉钉 — Stream 模式配置 | 企业内部 / ISV 应用 Stream 推送 | https://developers.dingtalk.com/document/isvapp/stream |

---

## 配置平面 · 多渠道管理（T2）

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| OpenClaw — Gateway 配置 | `channels.*`、dmPolicy、modelByChannel | https://docs.openclaw.ai/gateway/configuration |
| OpenClaw — Config channels |  per-channel 键参考 | https://docs.openclaw.ai/gateway/config-channels |
| LangBot — Pipelines | Bot × Pipeline、外接 Dify/Coze | https://docs.langbot.app/en/usage/pipelines/readme |
| LangBot — Bot 与 Adapter | 平台绑定、路由规则 | https://deepwiki.com/langbot-app/LangBot/4.2-bot-configuration-and-platform-adapters |
| Hermes — channel_overrides | 按 channelId 覆盖 model/prompt | https://github.com/NousResearch/hermes-agent/pull/1991 |
| Configuration as Code | 多租户 SaaS 配置 GitOps | https://dev.to/sbimochan/configuration-as-code-the-missing-gitops-layer-in-multi-tenant-saas-1kph |

---

## T3 前端现代化（2026 业界参考）

> 任务 SSOT：[T3-frontend-modernization.md](./T3-frontend-modernization.md)。评审 T3 子项时先读本节 + 任务书「设计定稿」。

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| Vite — Multi-Page App | 多 HTML 入口、`rollupOptions.input` | https://vite.dev/guide/build.html#multi-page-app |
| Vite — Build | 生产构建、`base`、Rolldown | https://vite.dev/guide/build |
| Tailwind v4 — Theme variables | `@theme` 设计 token | https://tailwindcss.com/docs/theme |
| Tailwind v4 — Vite 插件 | `@tailwindcss/vite` | https://tailwindcss.com/docs/installation/using-vite |
| Strangler Fig（概念） | 增量替换、禁止 Big Bang | https://martinfowler.com/bliki/StranglerFigApplication.html |
| Strangler Fig（实践） | Facade、逐能力迁移、Eliminate | https://hld.handbook.academy/curriculum/architecture-patterns/strangler-fig/ |
| Enterprise UI — Strangler + Vite proxy | Dev 期路由 facade、codemods | https://stevekinney.com/courses/enterprise-ui/strangler-fig-introduction |
| Webpack→Vite 大仓（2026） | 增量、双 bundler、CJS 陷阱 | https://www.pkgpulse.com/guides/webpack-to-vite-migration-large-codebases-2026 |
| CRA→Vite 复盘 | **先 E2E 再换 bundler** | https://zenn.dev/mizchi/articles/irusiru-modernize-cra-to-vite?locale=en |
| Playwright — 韧性 locator | Role/testid、POM、 survived refactors | https://currents.dev/posts/designing-playwright-tests-that-survive-ui-refactors |
| Tailwind 4 — NPM Workspace | `@source` 扫描共享包 | https://nx.dev/blog/setup-tailwind-4-npm-workspace |
| Tailwind — 跨项目共享 theme | `@import` 共享 CSS | https://nx.dev/blog/sharing-tailwind-styles-nx-monorepo |

---

## 记忆多租户隔离（T4-06-06）

> 任务 SSOT：[T4-account-session.md](./T4-account-session.md) T4-06-06。评审「记忆按 userId 隔离」时先读本节。核心结论：namespace-per-user + 每次检索强制按 user 作用域过滤；共享向量库无 per-user namespace 是公认反模式。

| 主题 | 说明 | 完整 URL |
|------|------|----------|
| Fastio — Multi-Tenant AI Agent 架构(2026) | Namespace/Workspace-per-tenant；向量库混租约风险与严格过滤 | https://fast.io/resources/ai-agent-multi-tenant-architecture/ |
| Prefactor — MCP 多租户安全 | `{tenant_id,user_id,agent_id,session_id}` 注入每次交互；服务端强制过滤 | https://prefactor.tech/blog/mcp-security-multi-tenant-ai-agents-explained |
| Mem0 — 记忆策略与作用域 | per-user/per-session/global 三层；`user_id` 强作用域 add/search | https://mem0.ai/blog/ai-agent-frameworks-and-how-to-choose-a-memory-strategy |
| Agent Memory 2026 横评(Mem0/Zep/Graphiti/Letta/LangMem) | 多租户维度对比；缺 per-user namespace → 跨域泄漏中位 ~53%（反模式） | https://medium.com/@wasowski.jarek/i-compared-5-ai-agent-memory-systems-across-6-dimensions-none-wins-6a658335ed0a |
| Redis — 多租户数据隔离 | tenant-prefixed key namespace（`tenant:{id}:...`）+ ACL | https://redis.io/blog/data-isolation-multi-tenant-saas/ |

---

## 本仓库改造路线文件

| 文件 | 路径 |
|------|------|
| 总路线图 | [todos/ROADMAP.md](./ROADMAP.md) |
| P0 核心 Harness | [todos/P0-core-harness.md](./P0-core-harness.md) |
| P1 控制面 | [todos/P1-control-plane.md](./P1-control-plane.md) |
| P2 MCP 平台化 | [todos/P2-mcp-platform.md](./P2-mcp-platform.md) |
| P3 Agent 运行时 | [todos/P3-agent-runtime.md](./P3-agent-runtime.md) |
| T0 目录架构 | [todos/T0-architecture.md](./T0-architecture.md) |
| T1 渠道+总线（Web + 飞书 + 钉钉） | [todos/T1-channel-bus.md](./T1-channel-bus.md) |
| T2 配置平面 + Admin | [todos/T2-config-plane.md](./T2-config-plane.md) |
| T3 前端现代化 | [todos/T3-frontend-modernization.md](./T3-frontend-modernization.md) |
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
| 遗留 Web UI → Vite/Tailwind | 本节 T3 表 + [T3-frontend-modernization.md](./T3-frontend-modernization.md) |

