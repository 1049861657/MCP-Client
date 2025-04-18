/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ToolCodeMapping` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ToolCodeMapping` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ToolCodeMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "originalString" TEXT NOT NULL
);
INSERT INTO "new_ToolCodeMapping" ("code", "id", "originalString") SELECT "code", "id", "originalString" FROM "ToolCodeMapping";
DROP TABLE "ToolCodeMapping";
ALTER TABLE "new_ToolCodeMapping" RENAME TO "ToolCodeMapping";
CREATE UNIQUE INDEX "ToolCodeMapping_code_key" ON "ToolCodeMapping"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
