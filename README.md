# MCP 工具调用演示 (TypeScript版 + Web界面)

这是一个使用 Model Context Protocol (MCP) SDK 的工具调用演示，使用TypeScript编写，包含一个Web界面来交互式调用Echo工具。项目采用模块化设计，具有良好的可扩展性。

## 功能

- 连接到 MCP 服务器
- 调用echo工具
- 提供Web界面，允许用户输入消息并获取Echo工具的响应

## 项目结构

```
MCP-Client/
├── package.json        # 项目配置和依赖
├── tsconfig.json       # TypeScript配置
├── README.md           # 项目说明文档
├── src/                # 源代码目录
│   ├── api/            # API控制器和路由
│   │   ├── echo.controller.ts  # Echo工具控制器
│   │   └── routes.ts           # API路由定义
│   ├── config/         # 配置文件
│   │   └── app.config.ts       # 应用配置
│   ├── core/           # 核心功能模块
│   │   ├── client.ts           # MCP客户端实现
│   │   └── server.ts           # MCP服务器实现
│   ├── interfaces/     # 接口定义
│   │   └── mcp.interfaces.ts   # MCP相关接口
│   ├── utils/          # 工具类
│   │   └── logger.ts           # 日志工具
│   ├── types/          # 类型定义
│   │   └── express.d.ts        # Express类型声明
│   └── app.ts          # 应用入口
├── public/             # 静态文件目录
│   ├── css/            # 样式文件
│   │   └── styles.css          # 主样式表
│   ├── js/             # JavaScript文件
│   │   └── app.js              # 前端脚本
│   └── index.html      # Web界面HTML
└── dist/               # 编译后的JavaScript文件
```

## 安装

克隆仓库后，安装依赖：

```bash
npm install
```

## 构建和运行

构建项目：

```bash
npm run build
```

运行应用：

```bash
npm start
```

开发模式（监视文件变化并自动重启）：

```bash
npm run dev
```

然后在浏览器中访问：http://localhost:3000

## Web界面使用

1. 打开浏览器访问 http://localhost:3000
2. 在文本框中输入要发送的消息
3. 点击"发送到Echo工具"按钮
4. 页面将显示工具调用结果

## 项目扩展指南

### 添加新工具

1. 在 `src/core/server.ts` 中注册新工具
2. 在 `src/interfaces/mcp.interfaces.ts` 添加相关接口
3. 在 `src/core/client.ts` 添加新的方法调用工具
4. 在 `src/api` 中创建控制器和路由
5. 在前端添加相应的UI和逻辑

### 添加新页面

1. 在 `public` 目录中创建新的HTML文件
2. 添加相应的CSS和JavaScript文件
3. 在 `src/api` 中添加相应的API接口

## 工具API

服务器提供的工具功能：

**Echo工具**：返回一个简单的工具调用结果
```typescript
// 服务器定义 (TypeScript)
const messageSchema = {
  message: z.string()
};

server.tool(
  "echo",
  messageSchema,
  async (params) => ({
    content: [{ type: "text", text: `Tool echo: ${params.message}` }]
  })
);

// 客户端使用 (TypeScript)
interface EchoToolParams {
  message: string;
}

mcpClient.callEchoTool("工具消息");
``` 