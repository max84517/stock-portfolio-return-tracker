import { addMonths, addWeeks, format, parseISO } from "date-fns";
import type { Currency, HoldingInput } from "@/lib/types";
import { getStockHistory, getUsdTwdHistory } from "@/lib/marketData";
import type { PricePoint } from "@/lib/yahooFinance";

export type BaseCurrency = "USD";
const BASE_CURRENCY: BaseCurrency = "USD";

export interface HoldingSeries {
  ticker: string;
  symbol: string;
  /** Total value (shares + any uninvested dividend cash) in base currency, by date. */
  valueByDate: Record<string, number>;
}

export interface MonthlyBreakdown {
  month: string; // yyyy-MM
  priceReturnPct: number | null;
  dividendAmount: number; // base currency
  totalReturnPct: number | null;
}

export interface BacktestResult {
  baseCurrency: BaseCurrency;
  dates: string[];
  totalValueByDate: Record<string, number>;
  priceOnlyValueByDate: Record<string, number>;
  holdings: HoldingSeries[];
  monthly: MonthlyBreakdown[];
  /** External cash contributed by the user (base currency), one entry per contribution date. */
  contributions: DatedValue[];
  totalInvested: number;
  finalValue: number;
  totalReturnAmount: number;
  totalReturnPct: number | null;
}

export interface DatedValue {
  date: string;
  value: number;
}

function nativeCurrencyFor(market: HoldingInput["market"]): Currency {
  return market === "US" ? "USD" : "TWD";
}

/** Converts an amount between USD and TWD using a same-day USD/TWD rate (TWD per 1 USD). */
function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  usdTwdRate: number,
): number {
  if (from === to) return amount;
  if (from === "USD" && to === "TWD") return amount * usdTwdRate;
  return amount / usdTwdRate; // TWD -> USD
}

export function buildForwardFillLookup(points: PricePoint[]): (date: string) => number | undefined {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return (date: string) => {
    let result: number | undefined;
    for (const p of sorted) {
      if (p.date > date) break;
      result = p.close;
    }
    return result;
  };
}

function generateDcaDates(
  start: string,
  end: string,
  frequency: "MONTHLY" | "WEEKLY",
): string[] {
  const dates: string[] = [];
  let cursor = parseISO(start);
  const endDate = parseISO(end);
  while (cursor <= endDate) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor = frequency === "MONTHLY" ? addMonths(cursor, 1) : addWeeks(cursor, 1);
  }
  return dates;
}

/** Snaps a target date to the first available trading date on/after it, if any. */
function snapToTradingDate(target: string, tradingDates: string[]): string | undefined {
  return tradingDates.find((d) => d >= target);
}

interface HoldingSimulation {
  symbol: string;
  native: Currency;
  /** Total value (base currency) at each of this holding's own trading dates. */
  totalValueByDate: Map<string, number>;
  /** Value (base currency) if dividends were never collected/reinvested. */
  priceOnlyValueByDate: Map<string, number>;
  /** External cash contributed by the user (base currency), keyed by date. */
  contributions: DatedValue[];
  /** Dividend cash received (base currency), keyed by date, regardless of reinvestment mode. */
  dividendsReceived: DatedValue[];
}

async function simulateHolding(
  holding: HoldingInput,
  start: string,
  end: string,
  fxByDate: (date: string) => number | undefined,
): Promise<HoldingSimulation> {
  const { symbol, prices, dividends } = await getStockHistory(
    holding.ticker,
    holding.market,
    parseISO(start),
    parseISO(end),
  );
  const native = nativeCurrencyFor(holding.market);
  const tradingDates = prices.map((p) => p.date).sort();
  const priceAt = buildForwardFillLookup(prices);
  const dividendByDate = new Map<string, number>(dividends.map((d) => [d.date, d.amount]));

  const contributionDates =
    holding.investMode === "LUMP_SUM"
      ? [start]
      : generateDcaDates(start, end, holding.dcaFrequency ?? "MONTHLY");

  const fx = (date: string): number => {
    const rate = fxByDate(date);
    if (rate === undefined) {
      throw new Error(`Missing USD/TWD rate for ${date}`);
    }
    return rate;
  };

  let shares = 0;
  let cashNative = 0;
  let priceOnlyShares = 0;

  const contributions: DatedValue[] = [];
  const dividendsReceived: DatedValue[] = [];
  const totalValueByDate = new Map<string, number>();
  const priceOnlyValueByDate = new Map<string, number>();

  const contributionByDate = new Map<string, number>();
  for (const target of contributionDates) {
    const tradingDate = snapToTradingDate(target, tradingDates);
    if (!tradingDate) continue;
    contributionByDate.set(
      tradingDate,
      (contributionByDate.get(tradingDate) ?? 0) + holding.amount,
    );
  }

  for (const date of tradingDates) {
    const price = priceAt(date);
    if (price === undefined) continue;
    const rate = fx(date);

    const contributionAmount = contributionByDate.get(date);
    if (contributionAmount) {
      const nativeAmount = convertCurrency(contributionAmount, holding.amountCurrency, native, rate);
      shares += nativeAmount / price;
      priceOnlyShares += nativeAmount / price;
      const baseAmount = convertCurrency(contributionAmount, holding.amountCurrency, BASE_CURRENCY, rate);
      contributions.push({ date, value: baseAmount });
    }

    const dividendPerShare = dividendByDate.get(date);
    if (dividendPerShare && shares > 0) {
      const dividendCashNative = shares * dividendPerShare;
      dividendsReceived.push({
        date,
        value: convertCurrency(dividendCashNative, native, BASE_CURRENCY, rate),
      });

      if (holding.dividendMode === "CASH") {
        cashNative += dividendCashNative;
      } else if (holding.dividendMode === "REINVEST_FULL") {
        shares += dividendCashNative / price;
      } else if (holding.dividendMode === "REINVEST_PERCENT") {
        const pct = Math.min(Math.max(holding.dividendModeParam ?? 0, 0), 100) / 100;
        shares += (dividendCashNative * pct) / price;
        cashNative += dividendCashNative * (1 - pct);
      } else if (holding.dividendMode === "REINVEST_FIXED") {
        const fixedNative = convertCurrency(
          holding.dividendModeParam ?? 0,
          holding.amountCurrency,
          native,
          rate,
        );
        const available = dividendCashNative + cashNative;
        const reinvest = Math.min(fixedNative, available);
        shares += reinvest / price;
        cashNative = available - reinvest;
      }
    }

    totalValueByDate.set(date, convertCurrency(shares * price + cashNative, native, BASE_CURRENCY, rate));
    priceOnlyValueByDate.set(date, convertCurrency(priceOnlyShares * price, native, BASE_CURRENCY, rate));
  }

  return { symbol, native, totalValueByDate, priceOnlyValueByDate, contributions, dividendsReceived };
}

function forwardFillOnCalendar(
  calendar: string[],
  byDate: Map<string, number>,
): Record<string, number> {
  const result: Record<string, number> = {};
  let last = 0;
  for (const date of calendar) {
    if (byDate.has(date)) last = byDate.get(date)!;
    result[date] = last;
  }
  return result;
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function computeMonthly(
  calendar: string[],
  totalByDate: Record<string, number>,
  priceOnlyByDate: Record<string, number>,
  allContributions: DatedValue[],
  allDividends: DatedValue[],
): MonthlyBreakdown[] {
  if (calendar.length === 0) return [];

  const months: string[] = [];
  for (const date of calendar) {
    const m = monthKey(date);
    if (months[months.length - 1] !== m) months.push(m);
  }

  const contributionsByMonth = new Map<string, number>();
  for (const c of allContributions) {
    const m = monthKey(c.date);
    contributionsByMonth.set(m, (contributionsByMonth.get(m) ?? 0) + c.value);
  }
  const dividendsByMonth = new Map<string, number>();
  for (const d of allDividends) {
    const m = monthKey(d.date);
    dividendsByMonth.set(m, (dividendsByMonth.get(m) ?? 0) + d.value);
  }

  // Last calendar date on/before the end of each month.
  const monthEndDate = new Map<string, string>();
  for (const date of calendar) monthEndDate.set(monthKey(date), date);

  const monthly: MonthlyBreakdown[] = [];
  let prevTotal = 0;
  let prevPriceOnly = 0;

  for (const m of months) {
    const endDate = monthEndDate.get(m)!;
    const endTotal = totalByDate[endDate];
    const endPriceOnly = priceOnlyByDate[endDate];
    const contrib = contributionsByMonth.get(m) ?? 0;
    const dividend = dividendsByMonth.get(m) ?? 0;

    const priceReturnPct =
      prevPriceOnly > 0 ? ((endPriceOnly - prevPriceOnly - contrib) / prevPriceOnly) * 100 : null;
    const totalReturnPct =
      prevTotal > 0 ? ((endTotal - prevTotal - contrib) / prevTotal) * 100 : null;

    monthly.push({ month: m, priceReturnPct, dividendAmount: dividend, totalReturnPct });

    prevTotal = endTotal;
    prevPriceOnly = endPriceOnly;
  }

  return monthly;
}

export async function runBacktest(
  startDateStr: string,
  endDateStr: string,
  holdings: HoldingInput[],
): Promise<BacktestResult> {
  if (holdings.length === 0) {
    throw new Error("At least one holding is required to run a backtest.");
  }

  const fxHistory = await getUsdTwdHistory(parseISO(startDateStr), parseISO(endDateStr));
  const fxByDate = buildForwardFillLookup(fxHistory);

  const simulations = await Promise.all(
    holdings.map((h) => simulateHolding(h, startDateStr, endDateStr, fxByDate)),
  );

  const calendarSet = new Set<string>();
  for (const sim of simulations) {
    for (const date of sim.totalValueByDate.keys()) calendarSet.add(date);
  }
  const calendar = [...calendarSet].sort();

  const holdingSeries: HoldingSeries[] = simulations.map((sim, i) => ({
    ticker: holdings[i].ticker,
    symbol: sim.symbol,
    valueByDate: forwardFillOnCalendar(calendar, sim.totalValueByDate),
  }));

  const totalValueByDate: Record<string, number> = {};
  const priceOnlyValueByDate: Record<string, number> = {};
  const perHoldingTotal = simulations.map((sim) => forwardFillOnCalendar(calendar, sim.totalValueByDate));
  const perHoldingPriceOnly = simulations.map((sim) =>
    forwardFillOnCalendar(calendar, sim.priceOnlyValueByDate),
  );

  for (const date of calendar) {
    totalValueByDate[date] = perHoldingTotal.reduce((sum, h) => sum + h[date], 0);
    priceOnlyValueByDate[date] = perHoldingPriceOnly.reduce((sum, h) => sum + h[date], 0);
  }

  const allContributions = simulations.flatMap((s) => s.contributions);
  const allDividends = simulations.flatMap((s) => s.dividendsReceived);

  const monthly = computeMonthly(
    calendar,
    totalValueByDate,
    priceOnlyValueByDate,
    allContributions,
    allDividends,
  );

  const totalInvested = allContributions.reduce((sum, c) => sum + c.value, 0);
  const finalValue = calendar.length > 0 ? totalValueByDate[calendar[calendar.length - 1]] : 0;
  const totalReturnAmount = finalValue - totalInvested;
  const totalReturnPct = totalInvested > 0 ? (totalReturnAmount / totalInvested) * 100 : null;

  return {
    baseCurrency: BASE_CURRENCY,
    dates: calendar,
    totalValueByDate,
    priceOnlyValueByDate,
    holdings: holdingSeries,
    monthly,
    contributions: allContributions,
    totalInvested,
    finalValue,
    totalReturnAmount,
    totalReturnPct,
  };
}

/** Converts every monetary figure in a backtest result from the engine's base currency to a display currency. */
export function convertResultToDisplayCurrency(
  result: BacktestResult,
  displayCurrency: Currency,
  fxByDate: (date: string) => number | undefined,
): {
  totalValueByDate: Record<string, number>;
  priceOnlyValueByDate: Record<string, number>;
  holdings: HoldingSeries[];
  monthlyDividends: Record<string, number>;
  totalInvested: number;
  finalValue: number;
  totalReturnAmount: number;
} {
  if (displayCurrency === "USD") {
    return {
      totalValueByDate: result.totalValueByDate,
      priceOnlyValueByDate: result.priceOnlyValueByDate,
      holdings: result.holdings,
      monthlyDividends: Object.fromEntries(result.monthly.map((m) => [m.month, m.dividendAmount])),
      totalInvested: result.totalInvested,
      finalValue: result.finalValue,
      totalReturnAmount: result.totalReturnAmount,
    };
  }

  const lastDate = result.dates[result.dates.length - 1];
  const finalRate = fxByDate(lastDate) ?? 1;

  const convertSeries = (byDate: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(byDate).map(([date, value]) => [date, value * (fxByDate(date) ?? finalRate)]),
    );

  // Each contribution is converted at its own date's rate rather than the
  // final date's rate, so investing (and later viewing) in the same
  // currency as the holding's native currency round-trips exactly instead
  // of drifting with FX movement between the contribution and end dates.
  const totalInvested = result.contributions.reduce(
    (sum, c) => sum + c.value * (fxByDate(c.date) ?? finalRate),
    0,
  );
  const finalValue = result.finalValue * finalRate;

  return {
    totalValueByDate: convertSeries(result.totalValueByDate),
    priceOnlyValueByDate: convertSeries(result.priceOnlyValueByDate),
    holdings: result.holdings.map((h) => ({ ...h, valueByDate: convertSeries(h.valueByDate) })),
    monthlyDividends: Object.fromEntries(
      result.monthly.map((m) => [m.month, m.dividendAmount * finalRate]),
    ),
    totalInvested,
    finalValue,
    totalReturnAmount: finalValue - totalInvested,
  };
}
