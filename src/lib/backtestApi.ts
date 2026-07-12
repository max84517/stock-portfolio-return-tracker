import type { Currency, HoldingInput } from "@/lib/types";

export interface BacktestApiHolding {
  ticker: string;
  symbol: string;
  valueByDate: Record<string, number>;
}

export interface BacktestApiMonthly {
  month: string;
  priceReturnPct: number | null;
  totalReturnPct: number | null;
  dividendAmount: number;
}

export interface BacktestApiResult {
  baseCurrency: Currency;
  dates: string[];
  totalValueByDate: Record<string, number>;
  priceOnlyValueByDate: Record<string, number>;
  holdings: BacktestApiHolding[];
  monthly: BacktestApiMonthly[];
  totalInvested: number;
  finalValue: number;
  totalReturnAmount: number;
  totalReturnPct: number | null;
  error?: string;
}

export interface BacktestRequest {
  startDate: string;
  endDate: string;
  displayCurrency: Currency;
  holdings: HoldingInput[];
}

export async function fetchBacktest(request: BacktestRequest): Promise<BacktestApiResult> {
  const res = await fetch("/api/backtest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = (await res.json()) as BacktestApiResult;
  if (!res.ok) {
    throw new Error(data.error ?? "Backtest request failed.");
  }
  return data;
}
