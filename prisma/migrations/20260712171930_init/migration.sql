-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "displayCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Holding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "strategyId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountCurrency" TEXT NOT NULL,
    "investMode" TEXT NOT NULL,
    "dcaFrequency" TEXT,
    "dcaAmount" REAL,
    "dividendMode" TEXT NOT NULL,
    "dividendModeParam" REAL,
    CONSTRAINT "Holding_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "close" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "DividendCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "FxCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pair" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "rate" REAL NOT NULL
);

-- CreateIndex
CREATE INDEX "Holding_strategyId_idx" ON "Holding"("strategyId");

-- CreateIndex
CREATE INDEX "PriceCache_ticker_idx" ON "PriceCache"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_ticker_date_key" ON "PriceCache"("ticker", "date");

-- CreateIndex
CREATE INDEX "DividendCache_ticker_idx" ON "DividendCache"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "DividendCache_ticker_date_key" ON "DividendCache"("ticker", "date");

-- CreateIndex
CREATE INDEX "FxCache_pair_idx" ON "FxCache"("pair");

-- CreateIndex
CREATE UNIQUE INDEX "FxCache_pair_date_key" ON "FxCache"("pair", "date");
