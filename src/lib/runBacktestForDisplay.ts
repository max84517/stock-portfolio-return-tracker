import { parseISO } from "date-fns";
import { runBacktest, convertResultToDisplayCurrency, buildForwardFillLookup } from "@/lib/backtest";
import { getUsdTwdHistory } from "@/lib/marketData";
import type { Currency, HoldingInput } from "@/lib/types";
import type { BacktestApiResult } from "@/lib/backtestApi";

export async function runBacktestForDisplay(
  startDate: string,
  endDate: string,
  displayCurrency: Currency,
  holdings: HoldingInput[],
): Promise<BacktestApiResult> {
  const result = await runBacktest(startDate, endDate, holdings);

  const fxHistory = await getUsdTwdHistory(parseISO(startDate), parseISO(endDate));
  const fxByDate = buildForwardFillLookup(fxHistory);
  const converted = convertResultToDisplayCurrency(result, displayCurrency, fxByDate);

  return {
    baseCurrency: displayCurrency,
    dates: result.dates,
    totalValueByDate: converted.totalValueByDate,
    priceOnlyValueByDate: converted.priceOnlyValueByDate,
    holdings: converted.holdings,
    monthly: result.monthly.map((m) => ({
      month: m.month,
      priceReturnPct: m.priceReturnPct,
      totalReturnPct: m.totalReturnPct,
      dividendAmount: converted.monthlyDividends[m.month] ?? 0,
    })),
    totalInvested: converted.totalInvested,
    finalValue: converted.finalValue,
    totalReturnAmount: converted.totalReturnAmount,
    totalReturnPct: result.totalReturnPct,
  };
}
