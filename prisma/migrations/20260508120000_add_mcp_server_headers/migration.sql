-- HTTP 类型 MCP 服务器自定义请求头字段
ALTER TABLE "MCPServer" ADD COLUMN "headers" BLOB;
