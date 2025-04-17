-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_QuickMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '默认'
);
INSERT INTO "new_QuickMessage" ("content", "id", "originalId", "result") SELECT "content", "id", "originalId", "result" FROM "QuickMessage";
DROP TABLE "QuickMessage";
ALTER TABLE "new_QuickMessage" RENAME TO "QuickMessage";
CREATE UNIQUE INDEX "QuickMessage_originalId_key" ON "QuickMessage"("originalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
