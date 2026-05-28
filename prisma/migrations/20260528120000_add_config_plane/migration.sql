-- T2 配置平面：AgentProfile + RouteRule
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "vendor" TEXT,
    "defaultModel" TEXT NOT NULL,
    "temperature" REAL,
    "maxTokens" INTEGER,
    "enableTools" BOOLEAN NOT NULL DEFAULT true,
    "enablePrompts" BOOLEAN NOT NULL DEFAULT true,
    "enableParamValidation" BOOLEAN NOT NULL DEFAULT false,
    "maxToolCallRounds" INTEGER NOT NULL DEFAULT 25,
    "enableAutoCompact" BOOLEAN,
    "compactModel" TEXT,
    "mcpServerIds" JSONB NOT NULL DEFAULT '[]',
    "toolPrompt" TEXT,
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "AgentProfile_profileId_key" ON "AgentProfile"("profileId");

CREATE TABLE "RouteRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL,
    "matchKey" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RouteRule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AgentProfile" ("profileId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RouteRule_channel_matchKey_key" ON "RouteRule"("channel", "matchKey");
CREATE INDEX "RouteRule_channel_enabled_priority_idx" ON "RouteRule"("channel", "enabled", "priority");
