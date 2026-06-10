# MCP Client

基于 Model Context Protocol (MCP) 的 AI 工具调用客户端：连接多个 MCP 服务器与 OpenAI 兼容模型，提供 Web 聊天界面，并支持钉钉、飞书等 IM 渠道接入。

## Quick Start

### 前置依赖

- **Node.js** 20+ 与 [pnpm](https://pnpm.io/)
- **Redis**：消息总线（BullMQ）依赖 `REDIS_URL`，未配置时进程启动失败
- **SQLite**：由 Prisma 管理，默认数据库路径见 `.env.example`

### 安装与启动

```bash
cp .env.example .env
# Windows: copy .env.example .env

pnpm install
pnpm db:migrate
pnpm start
```

`pnpm start` 会执行完整构建（后端 TypeScript + 前端 Vite）并启动服务。若已构建，可单独运行 `pnpm run server`。

启动成功后访问 **http://localhost:3000**（默认端口 3000，可在配置管理中修改）。首页可进入 AI 对话；访问 `/info.html` 可查看 MCP 服务器与工具列表。

## 功能

- **多服务器管理**：同时连接多个 MCP 服务器，自动发现并聚合工具
- **多模型接入**：兼容 OpenAI API 格式的提供商（API Key、Base URL、模型名可配置）
- **流式对话**：SSE 实时推送 AI 响应与工具调用过程
- **工具调用可视化**：展示工具名称、参数、执行结果、耗时与 token 用量
- **子 Agent 进度**：对声明 `supportsProgress` 的长耗时工具，展示步骤时间线与单步耗时
- **超时自适应**：默认单步工具超时 60s；收到进度通知后自动重置计时
- **MCP 能力面**：Tools 对话主路径；Resources / Prompts 在 info 页只读浏览；远程服 OAuth 与连接状态机
- **工具执行权限**：Web 聊天支持 open / interactive / locked；interactive 下敏感工具需确认后继续
- **上下文预算**：可手动压缩或开启自动摘要；超大工具结果落盘，内置 `read_persisted_output` 分段读取
- **配置持久化**：SQLite（Prisma）存储 MCP 服务器、模型与系统设置
- **IM 渠道**：可选接入钉钉、飞书；通过 Admin API 管理渠道 Profile 与路由

## 背景：MCP

MCP（Model Context Protocol）是标准化大模型与外部工具交互的开放协议：

- **工具发现**：模型动态发现可用工具及参数定义
- **标准化调用**：统一的工具调用接口与数据格式
- **进度通知**：长耗时工具可通过 `notifications/progress` 推送执行进度
- **传输灵活**：支持 stdio（本地进程）与 Streamable HTTP（远程服务）

## 架构概览

```
MCP-Client/
├── src/              # 后端：API、Agent Harness、MCP 客户端、渠道适配、消息总线
├── frontend/         # Web UI 源码（Vite MPA + Tailwind v4）
├── public/           # Express 静态托管（含 Vite 构建产物）
├── prisma/           # 数据库 Schema 与迁移
└── dist/             # 后端编译产物
```

## 使用说明

### 首页（`/` 或 `index.html`）

- 产品概览与快捷入口（AI 对话、服务状态）

### AI 聊天（`ai.html`）

- 选择提供商与模型，发起流式对话（`/api/chat/stream` SSE）
- 工具调用卡片展示参数、耗时与 token；`executeApi` 等长任务工具可显示进度时间线
- 设置中可配置权限模式、自动压缩阈值、摘要模型与最大工具轮次
- 工具栏可手动触发上下文压缩或查看 token 预算预览

### 服务器信息（`info.html`）

- 查看已连接的 MCP 服务器状态（`connecting` / `connected` / `needs-auth` / `failed`）
- 浏览 Tools、Resources、Prompts（后两者只读，不进对话上下文）
- 试跑工具并查看标准化结果（`UnifiedToolResult`）

### 配置管理（`settings.html`）

- 管理 AI 提供商与模型
- 配置 MCP 服务器（stdio / HTTP）
- 系统参数（System Prompt、快捷消息等）

### 渠道管理（`admin.html`）

- 配置钉钉、飞书等渠道的默认模型与 MCP 工具（需登录；账号体系见 better-auth）
- 聊天页偏好存浏览器 `localStorage`；IM 渠道能力存 AgentProfile

## 配置

### 环境变量

| 变量 | 用途 |
|------|------|
| `DATABASE_URL` | Prisma SQLite 路径 |
| `REDIS_URL` | 消息总线（必填） |
| `BETTER_AUTH_SECRET` | better-auth 会话/Cookie 签名密钥（生产必填） |
| `BETTER_AUTH_URL` | 站点基址（如 `http://localhost:3000`） |
| `INBOUND_WORKER_CONCURRENCY` | Inbound Worker 并发数（可选，默认 5） |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书渠道（未配置则不启动） |
| `FEISHU_DOMAIN` | 国际 Lark 租户设为 `lark`（可选） |
| `DINGTALK_CLIENT_ID` / `DINGTALK_CLIENT_SECRET` | 钉钉渠道（未配置则不启动） |
| `MCP_CLIENT_ROOTS` | MCP roots 工作区路径（`;` 或 `,` 分隔；可选，未设置则不启用 roots） |
| `MCP_OAUTH_REDIRECT_URL` | 远程 MCP OAuth 回调完整 URL（可选；默认 `http://localhost:3000/api/mcp/oauth/callback`） |

完整示例与说明见 [`.env.example`](./.env.example)。

Admin API（`/api/admin/*`）与公开聊天 API（`/api/chat/*`）分离：前者管理 Profile/Route，后者处理终端用户对话。

## 扩展与集成

### 接入新的 AI 模型

在配置管理页添加提供商，填写 API Key、Base URL 与模型名称（OpenAI API 兼容即可）。

### 接入新的 MCP 服务器

在配置管理页添加服务器：

- **stdio**：命令行启动参数
- **HTTP**：服务 URL 与可选 Headers

### IM 渠道（钉钉 / 飞书）

在 `.env` 中配置对应应用凭证后重启服务；在 `admin.html` 中通过 Admin API 维护 Profile 与路由规则。

### 长耗时工具与进度协议

若 MCP 服务端提供子 Agent 类长任务工具（如动态网关的 `executeApi`）：

1. 客户端对该类工具启用 `supportsProgress` 与进度回调
2. 服务端通过 `notifications/progress` 推送进度（`progress` / `total` / `message`）
3. 以 `progress === total` 作为完成信号

UI 展示步骤时间线；收到进度通知后重置单步空闲超时（默认 60s）。
