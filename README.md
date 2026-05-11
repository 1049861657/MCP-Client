# MCP Client（TypeScript + Web UI）

基于 Model Context Protocol (MCP) 的 AI 工具调用客户端，支持多模型、多服务器连接，提供完整的 Web 聊天界面。

## 什么是 MCP

MCP（Model Context Protocol）是一个开放协议，标准化了大型语言模型与外部工具的交互方式：

- **工具发现**：模型动态发现可用工具及其参数定义
- **标准化调用**：统一的工具调用接口与数据格式
- **进度通知**：长耗时工具可通过 `notifications/progress` 实时推送执行进度
- **传输层灵活**：支持 stdio（本地进程）与 Streamable HTTP（远程服务）

## 核心功能

- **多服务器管理**：同时连接多个 MCP 服务器，自动发现并聚合所有工具
- **多模型接入**：兼容 OpenAI、DeepSeek 等标准 OpenAI API 格式的模型
- **流式对话**：SSE 实时推送 AI 响应与工具调用过程
- **工具调用可视化**：展示工具名称、参数、执行结果及耗时
- **子 Agent 进度面板**：对支持 `supportsProgress` 的工具，实时展示子 Agent 每步执行情况
- **超时自适应**：普通工具 60s 固定超时；子 Agent 工具每步 60s 并在收到进度通知后自动重置
- **参数智能验证**：调用前自动通过 `getApiDetails` 核验必填参数
- **配置持久化**：基于 SQLite（Prisma）存储服务器配置、模型配置及系统设置

## 项目结构

```
MCP-Client/
├── src/
│   ├── api/                # HTTP API 控制器与路由
│   ├── core/
│   │   ├── client.ts       # 多服务器连接管理、工具路由
│   │   └── server-connection.ts  # 单服务器连接、工具调用、进度通知
│   ├── servers/
│   │   └── openai.ts       # OpenAI 兼容模型调用、流式处理、工具调用循环
│   ├── services/           # 数据库配置服务
│   ├── interfaces/         # 类型与接口定义
│   ├── utils/              # 日志、工具名编解码等工具类
│   └── app.ts              # 应用入口
├── public/
│   ├── ai.html             # AI 聊天页面
│   ├── info.html           # MCP 服务器与工具信息
│   ├── settings.html       # 配置管理
│   ├── css/
│   └── js/
├── prisma/
│   └── schema.prisma       # 数据库模型定义
└── dist/                   # 编译产物
```

## 安装与运行

推荐使用 [pnpm](https://pnpm.io/)：

```bash

# 安装依赖
pnpm install

# 初始化数据库
pnpm exec prisma migrate deploy

# 构建并启动
pnpm start
```

应用默认在 `http://localhost:3000` 启动。

## 页面说明

### AI 聊天（ai.html）

- 选择 AI 提供商与模型，发起对话
- 流式展示 AI 响应与工具调用过程
- 工具调用卡片显示参数、耗时、token 用量
- 支持 `supportsProgress` 的子 Agent 工具显示实时进度面板（步骤时间线 + 工具 chip）

### 服务器信息（info.html）

- 查看已连接的 MCP 服务器状态
- 浏览所有可用工具及其参数定义

### 配置管理（settings.html）

- 管理 AI 提供商与模型
- 配置 MCP 服务器连接（stdio / HTTP）
- 设置系统参数（System Prompt、快捷消息等）

## 工具超时机制

| 工具类型 | 超时策略 |
|---|---|
| 普通工具 | 固定 60s |
| 子 Agent 工具（`supportsProgress: true`） | 每步 60s，收到进度通知后自动重置 |

服务端可通过工具 schema 的 `x-mcp-call-options.timeout` 字段声明自定义超时，客户端自动读取并应用。

> **`x-mcp-call-options`** 为本项目与服务端约定的私有扩展字段，非 MCP 标准规范。

## 子 Agent 进度通知协议

> **以下为本项目与服务端的私有约定，非 MCP 通用标准。**

对于服务端通过子 Agent 循环执行的长耗时工具（如知识库问答），服务端需：

1. 在 `getApiDetails` 响应中声明 `supportsProgress: true`
2. 每完成一步通过 `notifications/progress` 推送进度（`progress` / `total` / `message`）
3. 最后一步以 `progress === total` 作为完成信号

客户端在调用前读取 `getApiDetails` 的 `supportsProgress` 字段，为 `true` 时自动附加 `_meta.progressToken`，并在 UI 中展示步骤时间线。

## 扩展开发

### 接入新的 AI 模型

在配置管理页面添加 AI 提供商，填写 API Key、Base URL 及模型名称（兼容 OpenAI API 格式即可）。

### 接入新的 MCP 服务器

在配置管理页面添加服务器配置：
- **stdio**：填写命令行启动参数
- **HTTP**：填写服务器 URL 及可选 Headers
