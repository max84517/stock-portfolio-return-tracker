#!/usr/bin/env node
import { createClient } from "@libsql/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const client = createClient({ url: databaseUrl });

const statements = [
  `CREATE TABLE IF NOT EXISTS "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "Holding" (
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
  )`,

  `CREATE TABLE IF NOT EXISTS "PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "close" REAL NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "DividendCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "FxCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pair" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "rate" REAL NOT NULL
  )`,

  `CREATE INDEX IF NOT EXISTS "Holding_strategyId_idx" ON "Holding"("strategyId")`,
  `CREATE INDEX IF NOT EXISTS "PriceCache_ticker_idx" ON "PriceCache"("ticker")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PriceCache_ticker_date_key" ON "PriceCache"("ticker", "date")`,
  `CREATE INDEX IF NOT EXISTS "DividendCache_ticker_idx" ON "DividendCache"("ticker")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DividendCache_ticker_date_key" ON "DividendCache"("ticker", "date")`,
  `CREATE INDEX IF NOT EXISTS "FxCache_pair_idx" ON "FxCache"("pair")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "FxCache_pair_date_key" ON "FxCache"("pair", "date")`,
];

async function initDb() {
  try {
    console.log("Initializing database...");

    for (const statement of statements) {
      try {
        await client.execute(statement);
      } catch (err) {
        // Ignore "table already exists" errors
        if (!err.message?.includes("already exists")) {
          throw err;
        }
      }
    }

    console.log("✓ Database initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Failed to initialize database:", error.message);
    process.exit(1);
  }
}

initDb();
