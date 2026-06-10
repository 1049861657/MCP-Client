# Backlog — 远期可选

> 以下任务**不在当前 Client 核心路线内**，视产品方向（IDE 插件 / 企业内部 Agent 平台 / 开源 MCP 参考实现）再启动。  
> 对应 ShareAI 高级章节，完整 URL 见 [REFERENCES.md](./REFERENCES.md)。

---

## B-01 持久任务系统

> 参考：[s12 Task System](https://learn.shareai.run/zh/s12/)

- [ ] **B-01-01** TaskRecord 持久化（`.tasks/task_*.json`）  
- [ ] **B-01-02** 依赖图：`blockedBy` / `blocks` + `is_ready()`  
- [ ] **B-01-03** 工具：`task_create` / `task_update` / `task_list` / `task_get`  
- [ ] **B-01-04** UI 任务板视图  

**启动条件**：Client 定位为「长期运行 Agent 工作台」而非聊天演示

---

## B-02 后台执行槽位

> 参考：[s13 Background Tasks](https://learn.shareai.run/zh/s13/)

- [ ] **B-02-01** `background_run` — 异步命令 + task_id 立即返回  
- [ ] **B-02-02** Notification 队列，下轮 LLM 调用前 drain  
- [ ] **B-02-03** 完整输出落盘，通知只含 preview  

**启动条件**：Client 需执行本地 shell / 长耗时测试  
**备注**：当前已通过 MCP 服务端 `supportsProgress` 部分覆盖

---

## B-03 定时调度

> 参考：[s14 Cron Scheduler](https://learn.shareai.run/zh/s14/)

- [ ] **B-03-01** ScheduleRecord + cron 检查循环  
- [ ] **B-03-02** 触发后注入主循环（非独立 Agent）  
- [ ] **B-03-03** 持久化 + `last_fired_at` 防重复  

**启动条件**：需要「每日报告」类无人值守场景；Web 应用需后台 worker 进程

---

## B-04 多 Agent 团队

> 参考：[s15 Teammate](https://learn.shareai.run/zh/s15/)、[s16 Team Protocol](https://learn.shareai.run/zh/s16/)、[s17 Autonomous Agents](https://learn.shareai.run/zh/s17/)

- [ ] **B-04-01** Teammate 名册 + 邮箱（JSONL inbox）  
- [ ] **B-04-02** 结构化协议：shutdown / plan_approval + request_id  
- [ ] **B-04-03** 自治认领：idle → scan ready tasks → claim  

**启动条件**：Client 演进为 Agent Orchestrator  
**备注**：与 Cursor/Claude Code 定位重叠，不建议在 MCP-Client 优先做

---

## B-05 Worktree 隔离

> 参考：[s18 Worktree](https://learn.shareai.run/zh/s18/)

- [ ] **B-05-01** Task ↔ Worktree 绑定  
- [ ] **B-05-02** enter / run / closeout 生命周期  
- [ ] **B-05-03** 事件日志  

**启动条件**：Client 需本地代码编辑 + 多任务并行  
**备注**：当前 Client 无本地文件工具，优先级极低

---

## B-06 CLI / SDK 对外接口

- [ ] **B-06-01** `npx @mcp-client/cli chat "..."` 调用 Harness  
- [ ] **B-06-02** 导出 `AgentHarness` 为 npm 包供 CI/CD 集成  
- [ ] **B-06-03** 与 Cursor `@cursor/sdk` 模式对齐文档  

**启动条件**：开源推广或嵌入其他产品

---

## B-07 语义工具检索

- [ ] **B-07-01** 100+ 工具时用 embedding 检索 top-K 再注入 schema  
- [ ] **B-07-02** 按用户 query 动态缩小工具集  

**2026 实践**：[AWS MCP Strategies](https://docs.aws.amazon.com/prescriptive-guidance/latest/mcp-strategies/introduction.html) workflow-scoped tools 进阶版  
**启动条件**：P1-06 白名单仍不足以支撑工具规模

---

## B-08 多模态与 Elicitation

- [ ] **B-08-01** MCP elicitation 流程 + Web UI 表单  
- [ ] **B-08-02** 图片/文件上传进 messages  
- [ ] **B-08-03** Vision 模型 tool loop 支持  

**启动条件**：MCP 服务端提供多模态工具

---

## 优先级建议

若产品路线为 **「企业 MCP 网关 + Web Chat」**：

```
P0 → P1 → P2 → P3 → B-06 → B-07
```

若产品路线为 **「本地 Agent IDE」**：

```
P0 → P1 → P3-04 → B-05 → B-04
```

若维持 **「演示 / 内部工具」**：

```
P0 → P1（压缩+恢复）→ P2-02 → 停止
```

---

## 参考链接

完整章节索引见 [REFERENCES.md](./REFERENCES.md)，主要包括：

- Learn Claude Code 系列：https://learn.shareai.run/zh/s01/ （s01–s19）
- [AWS MCP Strategies](https://docs.aws.amazon.com/prescriptive-guidance/latest/mcp-strategies/introduction.html)
- [MCP SDK TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
- [GitHub Copilot Agent Mode + MCP](https://docs.github.com/en/copilot/how-tos/use-copilot-extensions/build-a-copilot-agent/use-context-passing)
