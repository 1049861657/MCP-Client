# MCP 工具调用演示 (TypeScript版 + Web界面)

这是一个基于 Model Context Protocol (MCP) 的工具调用框架，旨在实现AI大模型与外部工具的无缝连接。项目使用TypeScript开发，提供完整的Web界面，支持多种AI模型与工具的交互调用，为AI应用开发提供标准化的工具调用能力。

## 什么是MCP (Model Context Protocol)

MCP是一个开放协议，专为大型语言模型(LLM)与外部工具的交互而设计。它解决了以下核心问题：

- **标准化工具调用**：定义了LLM调用外部工具的统一接口和数据格式
- **双向通信**：支持模型向工具发送请求，并接收工具返回的结果
- **参数验证**：提供输入参数的结构化定义和验证机制
- **工具发现**：允许模型动态发现可用的工具及其能力

本项目实现了MCP协议的客户端和服务器组件，允许您轻松地将自定义工具集成到AI应用中。

## 核心功能

- **MCP服务器连接管理**：支持 stdio 与远程 HTTP（Streamable HTTP）两种连接方式
- **工具注册与调用**：简化工具的注册和调用流程
- **多模型接入**：兼容多种大型语言模型，包括OpenAI、Deepseek等
- **Web可视化界面**：完整的工具调用演示和管理界面
- **实时状态监控**：监控MCP服务器和工具的运行状态
- **高可扩展性**：模块化设计，易于扩展新工具和能力

## 系统架构

本项目采用多层架构设计，包括：

1. **Web前端层**：提供用户交互界面
2. **API服务层**：处理HTTP请求和响应
3. **MCP核心层**：实现MCP协议的客户端和服务器
4. **工具扩展层**：支持自定义工具的注册和调用

### 项目结构

```
MCP-Client/
├── package.json        # 项目配置和依赖
├── tsconfig.json       # TypeScript配置
├── README.md           # 项目说明文档
├── src/                # 源代码目录
│   ├── api/            # API控制器和路由
│   │   ├── tool-calling.controller.ts  # 工具调用控制器
│   │   ├── info.controller.ts          # 服务信息控制器
│   │   └── routes.ts                   # API路由定义
│   ├── config/         # 配置文件
│   │   └── app.config.ts               # 应用配置
│   ├── core/           # 核心功能模块
│   │   ├── client.ts                   # MCP客户端实现
│   │   └── server.ts                   # MCP服务器实现
│   ├── interfaces/     # 接口定义
│   │   └── mcp.interfaces.ts           # MCP相关接口
│   ├── utils/          # 工具类
│   │   └── logger.ts                   # 日志工具
│   ├── types/          # 类型定义
│   │   └── express.d.ts                # Express类型声明
│   ├── servers/        # 服务器实现
│   │   └── echo-MCP.ts                 # Echo工具服务器
│   └── app.ts          # 应用入口
├── public/             # 静态文件目录
│   ├── css/            # 样式文件
│   │   └── styles.css                  # 主样式表
│   ├── js/             # JavaScript文件
│   │   ├── index.js                    # 首页脚本
│   │   └── ai.js                       # AI聊天页面脚本
│   ├── index.html      # 首页
│   ├── ai.html         # AI聊天页面
│   ├── info.html       # 服务信息页面
│   └── settings.html   # 配置管理页面
└── dist/               # 编译后的JavaScript文件
```

## 安装

克隆仓库后，安装依赖：

```bash
npm install
```

## 构建和运行


```bash
npm run start
```

应用将在 http://localhost:3000 启动

## 页面功能说明

### 首页 (index.html)

首页提供项目概述和主要功能导航：

- 核心功能展示
- 支持的AI模型和供应商介绍
- 页面导航链接

### AI聊天页面 (ai.html)

提供与AI模型的交互界面：

1. 选择AI提供商和模型
2. 输入问题或指令
3. 查看AI响应，包括工具调用过程
4. 查看token使用情况和响应时间

### 服务信息页面 (info.html)

显示MCP服务器的状态和工具信息：

1. 查看当前连接的服务器信息
2. 切换不同的MCP服务器
3. 查看可用工具列表及其参数

### 配置管理页面 (settings.html)

管理系统配置：

1. 配置AI提供商信息
2. 设置系统功能参数
3. 管理服务器连接配置


## 扩展开发指南

### 添加新的AI模型

1. 在 `config/ai-providers.json` 中添加新的模型供应商
2. 在 `src/api/openai.controller.ts` 中添加对新模型的支持
3. 在前端界面中添加模型选项

