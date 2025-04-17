/*
  Warnings:

  - You are about to drop the column `apiPath` on the `AIProvider` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerId,value]` on the table `AIModel` will be added. If there are existing duplicate values, this will fail.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AIProvider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_providerId_value_key" ON "AIModel"("providerId", "value");
