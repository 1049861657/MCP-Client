-- P2-03: per-server MCP OAuth token storage
CREATE TABLE "MCPServerAuth" (
    "serverId" TEXT NOT NULL PRIMARY KEY,
    "tokens" JSONB,
    "expiresAt" DATETIME,
    "clientInfo" JSONB,
    "codeVerifier" TEXT,
    "discoveryState" JSONB,
    "oauthState" TEXT,
    "updatedAt" DATETIME NOT NULL
);
