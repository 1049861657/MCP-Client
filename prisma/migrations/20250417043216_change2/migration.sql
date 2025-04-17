/*
  Warnings:

  - The primary key for the `AIModel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `AIProvider` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MCPServer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `QuickMessage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `originalId` on the `QuickMessage` table. All the data in the column will be lost.
  - Added the required column `sortId` to the `QuickMessage` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIModel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AIModel" ("id", "label", "providerId", "value") SELECT "id", "label", "providerId", "value" FROM "AIModel";
DROP TABLE "AIModel";
ALTER TABLE "new_AIModel" RENAME TO "AIModel";
CREATE UNIQUE INDEX "AIModel_providerId_value_key" ON "AIModel"("providerId", "value");
CREATE TABLE "new_AIProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "defaultModelValue" TEXT NOT NULL
);
INSERT INTO "new_AIProvider" ("apiKey", "apiUrl", "defaultModelValue", "id", "name", "type") SELECT "apiKey", "apiUrl", "defaultModelValue", "id", "name", "type" FROM "AIProvider";
DROP TABLE "AIProvider";
ALTER TABLE "new_AIProvider" RENAME TO "AIProvider";
CREATE UNIQUE INDEX "AIProvider_name_key" ON "AIProvider"("name");
CREATE TABLE "new_MCPServer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL,
    "connectionType" TEXT NOT NULL,
    "command" TEXT,
    "args" JSONB,
    "sseUrl" TEXT
);
INSERT INTO "new_MCPServer" ("args", "command", "connectionType", "id", "isActive", "name", "serverId", "sseUrl") SELECT "args", "command", "connectionType", "id", "isActive", "name", "serverId", "sseUrl" FROM "MCPServer";
DROP TABLE "MCPServer";
ALTER TABLE "new_MCPServer" RENAME TO "MCPServer";
CREATE UNIQUE INDEX "MCPServer_serverId_key" ON "MCPServer"("serverId");
CREATE TABLE "new_QuickMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sortId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '默认'
);
INSERT INTO "new_QuickMessage" ("category", "content", "id", "result") SELECT "category", "content", "id", "result" FROM "QuickMessage";
DROP TABLE "QuickMessage";
ALTER TABLE "new_QuickMessage" RENAME TO "QuickMessage";
CREATE UNIQUE INDEX "QuickMessage_sortId_key" ON "QuickMessage"("sortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
