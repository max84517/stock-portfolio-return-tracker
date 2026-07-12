/*
  Warnings:

  - You are about to drop the column `dcaAmount` on the `Holding` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountCurrency" TEXT NOT NULL,
    "investMode" TEXT NOT NULL,
    "dcaFrequency" TEXT,
    "dividendMode" TEXT NOT NULL,
    "dividendModeParam" REAL,
    CONSTRAINT "Holding_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Holding" ("amount", "amountCurrency", "dcaFrequency", "dividendMode", "dividendModeParam", "id", "investMode", "market", "strategyId", "ticker") SELECT "amount", "amountCurrency", "dcaFrequency", "dividendMode", "dividendModeParam", "id", "investMode", "market", "strategyId", "ticker" FROM "Holding";
DROP TABLE "Holding";
ALTER TABLE "new_Holding" RENAME TO "Holding";
CREATE INDEX "Holding_strategyId_idx" ON "Holding"("strategyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
