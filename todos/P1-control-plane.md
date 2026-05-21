# P1 — 控制面四件套

> **目标**：补齐 [s06](https://learn.shareai.run/zh/s06/)–[s11](https://learn.shareai.run/zh/s11/) 控制面，使 Client 具备长会话稳定性、失败自愈、安全门控。  
> **参考索引**：[REFERENCES.md](./REFERENCES.md)  
> **前置**：P0 全部完成  
> **预估**：3 周  
> **2026 对齐**：AWS MCP「workflow-scoped tools」、Agents SDK recovery、least-privilege gate

---

## P1-01 上下文压缩

> 参考：[s06 Context Compact](https://learn.shareai.run/zh/s06/)

**背景**：MCP 工具（尤其 `executeApi`、文件读取类）返回大量文本，无压缩必撞窗口。

### 三层策略

1. **大结果落盘**：超阈值写 `.agent-outputs/`，上下文只留 preview  
2. **微压缩**：只保留最近 N 个完整 tool_result，旧的改占位  
3. **摘要压缩**：整体历史超预算时 LLM 摘要，保留目标/文件/决定/下一步

### 任务

- [ ] **P1-01-01** 新建 `src/core/agent-harness/context-budget.ts`  
  - 功能：`estimateTokenCount()`（可用字符/4 启发式或 tiktoken）  
  - 涉及：新建模块  
  - 验收：每轮 LLM 调用前输出 budget 日志

- [ ] **P1-01-02** 实现 `persistLargeOutput(toolUseId, output)` 落盘 + preview 标记  
  - 阈值建议：8000 字符  
  - 涉及：`context-budget.ts`  
  - 验收：大 SQL 结果不整段进 messages

- [ ] **P1-01-03** 实现 `microCompact(messages, keepRecent=3)`  
  - 涉及：`context-budget.ts`、`agent-loop.ts`  
  - 验收：20 轮后 prompt token 明显低于无压缩

- [ ] **P1-01-04** 实现 `compactHistory(messages)` 摘要压缩  
  - 涉及：`context-budget.ts`；可复用 LLM Provider  
  - 验收：摘要含「目标、已完成、修改文件、下一步」四要素

- [ ] **P1-01-05** 提供手动 `/compact` 或 API 触发入口  
  - 涉及：`src/api/openai.controller.ts`、前端快捷指令  
  - 验收：用户可主动压缩当前会话

---

## P1-02 错误恢复

> 参考：[s11 Error Recovery](https://learn.shareai.run/zh/s11/)（中文页慢时可读 [英文版](https://learn.shareai.run/en/s11/)）

**背景**：当前 tool 失败仅 catch 返回错误文本；`max_tokens` 截断、context overflow、MCP 瞬态断连无分类恢复。

### 三类 recoverable + 一类 terminal

| 类型 | 触发 | 动作 |
|------|------|------|
| continuation | `finish_reason: length` | 注入「从断点继续」reminder |
| compact | prompt too long / context 错误 | 触发 P1-01 压缩后重试 |
| backoff | timeout / rate limit / ECONNRESET | 指数退避 + jitter |
| fail | 未知 / 超预算 | 终止并告知用户 |

### 任务

- [ ] **P1-02-01** 新建 `src/core/agent-harness/recovery-manager.ts`  
  - 功能：`chooseRecovery(stopReason, errorText) -> IRecoveryDecision`  
  - 涉及：新建模块  
  - 验收：单元测试覆盖四类分类

- [ ] **P1-02-02** 实现 `IRecoveryState` 计数器（每类独立 budget，默认 max 3）  
  - 涉及：`recovery-manager.ts`、`loop-state.ts`  
  - 验收：超 budget 不再重试，reason 可见

- [ ] **P1-02-03** 在 agent-loop 中接入 recovery 分支（LLM 调用 + MCP callTool 两层）  
  - 涉及：`agent-loop.ts`、`server-connection.ts`  
  - 验收：模拟 rate limit 可自动退避成功

- [ ] **P1-02-04** MCP 连接瞬态错误映射到 backoff（`-32000` 系列已有重连，补 Harness 层重试）  
  - 涉及：`server-connection.ts`、`recovery-manager.ts`  
  - 验收：单次断连不终止整轮 Agent

---

## P1-03 权限门

> 参考：[s07 Permission](https://learn.shareai.run/zh/s07/)

**背景**：所有 MCP 工具裸执行。2026 生产 MCP 要求 OAuth + scoped credentials + 用户确认。

**Client 定位**：Web UI 演示 → 先做 **本地规则 + UI 确认弹窗**，OAuth 留 P2。

### 管道顺序

```
deny rules → mode check → allow rules → ask user → execute
```

### 任务

- [ ] **P1-03-01** 新建 `src/core/agent-harness/permission-gate.ts`  
  - 类型：`IPermissionRule`、`IPermissionDecision`  
  - 涉及：新建模块  
  - 验收：`checkPermission(toolName, input) -> { behavior, reason }`

- [ ] **P1-03-02** 实现三种模式：`default`（灰区 ask）、`plan`（只读）、`auto`（安全只读过）  
  - 涉及：`permission-gate.ts`、`feature-config.ts`  
  - 验收：settings 页可切换 mode

- [ ] **P1-03-03** 默认 deny 规则：写文件类 / 危险 MCP 工具名模式（可配置）  
  - 涉及：`permission-gate.ts`  
  - 验收：匹配规则直接返回 deny tool_result

- [ ] **P1-03-04** 前端权限确认 UI（SSE 事件 `permission_request` → 用户 approve/deny）  
  - 涉及：`public/js/ai-ui.js`、`openai.controller.ts`  
  - 验收：ask 类工具阻塞至用户确认

- [ ] **P1-03-05** MCP 工具与本地工具统一过 PermissionGate（[s19 MCP](https://learn.shareai.run/zh/s19/) 要求）  
  - 涉及：`tool-executor.ts`  
  - 验收：无 bypass 路径

---

## P1-04 System Prompt 流水线

> 参考：[s10 Prompt Pipeline](https://learn.shareai.run/zh/s10/)

**背景**：当前 `formatMessages()` 将 `mcpToolPrompt` + 各服 `instructions` 简单拼接，无分段、无动态/静态边界。

### 分段结构

```
core + tools + skills_catalog + memory + project_rules + dynamic(date/cwd/mode)
```

### 任务

- [ ] **P1-04-01** 新建 `src/core/agent-harness/prompt-pipeline.ts` — `SystemPromptBuilder`  
  - 涉及：新建模块；从 `openai.ts` `formatMessages` 抽出  
  - 验收：每段独立 `_buildXxx()` 方法

- [ ] **P1-04-02** 动态段与稳定段分离；reminder 不进 system prompt  
  - 涉及：`prompt-pipeline.ts`  
  - 验收：每轮 reminder 作为独立 user 块注入

- [ ] **P1-04-03** MCP instructions 按启用工具的服务器过滤注入（已有逻辑迁移）  
  - 涉及：`prompt-pipeline.ts`、`client.ts`  
  - 验收：禁用服务器的 instructions 不出现

- [ ] **P1-04-04** settings 页分段预览（可选）  
  - 涉及：`public/settings.html`、`settings.js`  
  - 验收：用户可见最终 prompt 各段来源

---

## P1-05 Hook 扩展点

> 参考：[s08 Hook](https://learn.shareai.run/zh/s08/)

**背景**：权限、审计、自定义校验不应继续堆在 loop 里。

### 任务

- [ ] **P1-05-01** 新建 `src/core/agent-harness/hook-runner.ts`  
  - 事件：`SessionStart`、`PreToolUse`、`PostToolUse`  
  - 返回：`exit_code: 0|1|2`（继续/阻止/注入消息）  
  - 涉及：新建模块  
  - 验收：注册表 `HOOKS[eventName][]`

- [ ] **P1-05-02** 内置 Hook：审计日志（PostToolUse）、参数大小检查（PreToolUse）  
  - 涉及：`hook-runner.ts`  
  - 验收：默认启用，可配置关闭

- [ ] **P1-05-03** 预留配置文件加载 Hook（`hooks.json`，参考 Cursor hooks 模式）  
  - 涉及：项目根或 `.mcp-client/hooks.json`  
  - 验收：文档说明扩展方式即可，实现可简版

---

## P1-06 Workflow-Scoped 工具过滤

**2026 实践**（AWS MCP Strategies）：不按会话暴露全部工具，按任务/服务器组过滤以减少 context 与误调用。

### 任务

- [ ] **P1-06-01** API 支持 `enabledToolServerIds`（已有）+ 新增 `enabledToolNames` 白名单  
  - 涉及：`openai.controller.ts`、`client.ts`  
  - 验收：前端可选择启用工具子集

- [ ] **P1-06-02** 工具定义缓存按「启用集 hash」分片  
  - 涉及：`MCPClientManager.getToolDefinitions`  
  - 验收：切换工具集不重新 list 全服

- [ ] **P1-06-03** Prompt 中 tools 段只描述启用工具（含 schema 摘要压缩）  
  - 涉及：`prompt-pipeline.ts`  
  - 验收：100+ 工具场景 prompt 体积可控

---

## P1-07 结构化审计与指标

### 任务

- [ ] **P1-07-01** 扩展 P0 审计日志：含 `tokens`、`recoveryKind`、`permissionDecision`  
  - 涉及：`audit.ts`  
  - 验收：单次 Agent 运行可重建决策链

- [ ] **P1-07-02** 新增 `/api/metrics/session-summary`（可选，调试用）  
  - 涉及：`src/api/routes.ts`  
  - 验收：返回最近 N 次会话 tool 统计

---

## P1 完成检查清单

- [ ] 40+ 轮会话可通过压缩 + 恢复继续
- [ ] 工具权限 ask/deny 流程可用
- [ ] Prompt 分段可维护、可测试
- [ ] Hook 可插拔至少 1 个自定义脚本
- [ ] 无新增 `openai.ts` 循环逻辑
