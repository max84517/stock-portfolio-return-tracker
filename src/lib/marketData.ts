import { prisma } from "@/lib/db";
import {
  fetchStockChart,
  fetchUsdTwdFx,
  type DividendPoint,
  type PricePoint,
} from "@/lib/yahooFinance";
import type { Market } from "@/lib/types";

const CACHE_BUFFER_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StockHistory {
  symbol: string;
  prices: PricePoint[];
  dividends: DividendPoint[];
}

function candidateSymbols(ticker: string, market: Market): string[] {
  if (market === "US") return [ticker.toUpperCase()];
  return [`${ticker}.TW`, `${ticker}.TWO`];
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Loose coverage check: cached rows must roughly span [start, end], allowing slack for weekends/holidays. */
function coversRange(dates: string[], start: Date, end: Date): boolean {
  if (dates.length === 0) return false;
  const min = dates[0];
  const max = dates[dates.length - 1];
  const bufferedStart = toISODate(new Date(start.getTime() + CACHE_BUFFER_DAYS * DAY_MS));
  const bufferedEnd = toISODate(new Date(end.getTime() - CACHE_BUFFER_DAYS * DAY_MS));
  return min <= bufferedStart && max >= bufferedEnd;
}

async function readCachedPrices(symbol: string, start: Date, end: Date): Promise<PricePoint[]> {
  const rows = await prisma.priceCache.findMany({
    where: { ticker: symbol, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ date: toISODate(r.date), close: r.close }));
}

async function readCachedDividends(
  symbol: string,
  start: Date,
  end: Date,
): Promise<DividendPoint[]> {
  const rows = await prisma.dividendCache.findMany({
    where: { ticker: symbol, date: { gte: start, lte: end } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ date: toISODate(r.date), amount: r.amount }));
}

/** Keeps the last value for each date, so a source array with duplicate dates can't violate the unique constraint. */
function dedupeByDate<T extends { date: string }>(points: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const p of points) byDate.set(p.date, p);
  return [...byDate.values()];
}

// Writes are upserts (not delete-then-insert) so that two requests racing to
// warm the same cache range converge instead of hitting the unique
// constraint on (ticker, date) / (pair, date).
async function writePriceCache(symbol: string, prices: PricePoint[]) {
  const deduped = dedupeByDate(prices);
  if (deduped.length === 0) return;
  await prisma.$transaction(
    deduped.map((p) =>
      prisma.priceCache.upsert({
        where: { ticker_date: { ticker: symbol, date: new Date(p.date) } },
        update: { close: p.close },
        create: { ticker: symbol, date: new Date(p.date), close: p.close },
      }),
    ),
  );
}

async function writeDividendCache(symbol: string, dividends: DividendPoint[]) {
  const deduped = dedupeByDate(dividends);
  if (deduped.length === 0) return;
  await prisma.$transaction(
    deduped.map((d) =>
      prisma.dividendCache.upsert({
        where: { ticker_date: { ticker: symbol, date: new Date(d.date) } },
        update: { amount: d.amount },
        create: { ticker: symbol, date: new Date(d.date), amount: d.amount },
      }),
    ),
  );
}

/**
 * Gets daily close price + dividend history for a ticker, using the Prisma
 * cache when it already covers the requested range and only hitting Yahoo
 * Finance otherwise. Taiwan tickers try the `.TW` (listed) symbol first and
 * fall back to `.TWO` (OTC).
 */
export async function getStockHistory(
  ticker: string,
  market: Market,
  start: Date,
  end: Date,
): Promise<StockHistory> {
  for (const symbol of candidateSymbols(ticker, market)) {
    const cachedPrices = await readCachedPrices(symbol, start, end);
    if (coversRange(cachedPrices.map((p) => p.date), start, end)) {
      const cachedDividends = await readCachedDividends(symbol, start, end);
      return { symbol, prices: cachedPrices, dividends: cachedDividends };
    }
  }

  const { symbol, data } = await fetchStockChart(ticker, market, start, end);
  await writePriceCache(symbol, data.prices);
  await writeDividendCache(symbol, data.dividends);
  return { symbol, prices: data.prices, dividends: data.dividends };
}

const FX_PAIR = "USDTWD";

/** Daily USD/TWD rate (1 USD = rate TWD) for the requested range. */
export async function getUsdTwdHistory(start: Date, end: Date): Promise<PricePoint[]> {
  // Extend the fetch range to ensure better forward-fill coverage at boundaries.
  // Yahoo Finance FX data may have gaps on weekends/holidays, so extra padding helps.
  const extendedStart = new Date(start.getTime() - 60 * DAY_MS);
  const extendedEnd = new Date(end.getTime() + 60 * DAY_MS);

  const cached = await prisma.fxCache.findMany({
    where: { pair: FX_PAIR, date: { gte: extendedStart, lte: extendedEnd } },
    orderBy: { date: "asc" },
  });
  const cachedPrices = cached.map((r) => ({ date: toISODate(r.date), close: r.rate }));
  if (coversRange(cachedPrices.map((p) => p.date), start, end)) {
    return cachedPrices;
  }

  const prices = await fetchUsdTwdFx(extendedStart, extendedEnd);
  const deduped = dedupeByDate(prices);
  if (deduped.length > 0) {
    await prisma.$transaction(
      deduped.map((p) =>
        prisma.fxCache.upsert({
          where: { pair_date: { pair: FX_PAIR, date: new Date(p.date) } },
          update: { rate: p.close },
          create: { pair: FX_PAIR, date: new Date(p.date), rate: p.close },
        }),
      ),
    );
  }
  return prices;
}
