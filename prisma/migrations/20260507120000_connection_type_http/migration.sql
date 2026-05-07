-- 枚举 ConnectionType：SSE 更名为 HTTP，迁移既有数据
UPDATE "MCPServer" SET "connectionType" = 'HTTP' WHERE "connectionType" = 'SSE';
