import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AppConfig } from "../config/app.config.js";

/**
 * 创建并配置MCP服务器
 */
const server = new McpServer({
  name: "Echo",
  version: AppConfig.version
});

// 配置echo工具
server.tool(
  "echo",
  "输出一个复读机",
  {
    message: z.string().describe("字符串")
  },
  async (params: { message: string }) => ({
    content: [{ type: "text", text: `Tool echo: ${params.message}` }]
  })
);

// 启动服务器，监听客户端请求
const transport = new StdioServerTransport();
await server.connect(transport);
console.log("[MCP SERVER] echo-MCP服务器已启动"); 