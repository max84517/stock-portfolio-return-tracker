import type { Market } from "@/lib/types";

const CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export interface PricePoint {
  date: string; // yyyy-MM-dd
  close: number;
}

export interface DividendPoint {
  date: string; // yyyy-MM-dd
  amount: number;
}

export interface ChartData {
  prices: PricePoint[];
  dividends: DividendPoint[];
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{ close: (number | null)[] }>;
      };
      events?: {
        dividends?: Record<string, { amount: number; date: number }>;
      };
    }> | null;
    error: { code: string; description: string } | null;
  };
}

function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}

function toISODate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

async function fetchChart(symbol: string, start: Date, end: Date): Promise<ChartData | null> {
  const params = new URLSearchParams({
    period1: String(toUnixSeconds(start)),
    period2: String(toUnixSeconds(end)),
    interval: "1d",
    events: "div",
    includeAdjustedClose: "true",
  });

  const res = await fetch(`${CHART_BASE}/${encodeURIComponent(symbol)}?${params.toString()}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Yahoo Finance request failed for ${symbol}: ${res.status}`);
  }

  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart.result?.[0];
  if (!result || data.chart.error) return null;

  const { timestamp, indicators } = result;
  const closes = indicators.quote[0]?.close ?? [];

  const prices: PricePoint[] = timestamp
    .map((ts, i) => ({ date: toISODate(ts), close: closes[i] }))
    .filter((p): p is PricePoint => typeof p.close === "number");

  const dividends: DividendPoint[] = Object.values(result.events?.dividends ?? {}).map((d) => ({
    date: toISODate(d.date),
    amount: d.amount,
  }));

  if (prices.length === 0) return null;

  return { prices, dividends };
}

/**
 * Resolves a bare ticker + market into the concrete Yahoo Finance symbol,
 * fetching chart data and falling back from .TW to .TWO for Taiwan tickers
 * that trade over-the-counter instead of on the main exchange.
 */
export async function fetchStockChart(
  ticker: string,
  market: Market,
  start: Date,
  end: Date,
): Promise<{ symbol: string; data: ChartData }> {
  if (market === "US") {
    const symbol = ticker.toUpperCase();
    const data = await fetchChart(symbol, start, end);
    if (!data) throw new Error(`No data found for US ticker "${ticker}"`);
    return { symbol, data };
  }

  const twSymbol = `${ticker}.TW`;
  const twData = await fetchChart(twSymbol, start, end);
  if (twData) return { symbol: twSymbol, data: twData };

  const twoSymbol = `${ticker}.TWO`;
  const twoData = await fetchChart(twoSymbol, start, end);
  if (twoData) return { symbol: twoSymbol, data: twoData };

  throw new Error(`No data found for Taiwan ticker "${ticker}" (tried .TW and .TWO)`);
}

/** USD/TWD is exposed on Yahoo Finance as the FX ticker "TWD=X". */
export async function fetchUsdTwdFx(start: Date, end: Date): Promise<PricePoint[]> {
  const data = await fetchChart("TWD=X", start, end);
  return data?.prices ?? [];
}
