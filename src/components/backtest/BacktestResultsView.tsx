"use client";

import { useMemo, useState, type ReactNode } from "react";
import { PortfolioChart } from "./PortfolioChart";
import { MonthlyReturnTable } from "./MonthlyReturnTable";
import { StatTile } from "@/components/ui/StatTile";
import { colorForIndex } from "@/lib/colors";
import { formatCurrency, formatPercent } from "@/lib/format";
import { fetchBacktest, type BacktestApiResult } from "@/lib/backtestApi";
import type { Currency, HoldingInput } from "@/lib/types";

interface BacktestResultsViewProps {
  holdings: HoldingInput[];
  startDate: string;
  endDate: string;
  initialResult: BacktestApiResult;
  initialDisplayCurrency: Currency;
  title?: string;
  headerActions?: ReactNode;
}

function returnTone(value: number | null): "positive" | "negative" | "neutral" {
  if (value === null || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}

export function BacktestResultsView({
  holdings,
  startDate,
  endDate,
  initialResult,
  initialDisplayCurrency,
  title = "Backtest Results",
  headerActions,
}: BacktestResultsViewProps) {
  const [result, setResult] = useState(initialResult);
  const [displayCurrency, setDisplayCurrency] = useState(initialDisplayCurrency);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(holdings.map((h) => h.ticker)));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const holdingMeta = useMemo(
    () => holdings.map((h, i) => ({ ticker: h.ticker, color: colorForIndex(i) })),
    [holdings],
  );

  async function handleCurrencyChange(currency: Currency) {
    if (currency === displayCurrency) return;
    setDisplayCurrency(currency);
    setIsLoading(true);
    try {
      const next = await fetchBacktest({ startDate, endDate, displayCurrency: currency, holdings });
      setResult(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reload backtest.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleHolding(ticker: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        if (next.size === 1) return prev; // keep at least one selected
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  }

  const valuesByKey = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const h of result.holdings) map[h.ticker] = h.valueByDate;
    return map;
  }, [result.holdings]);

  const filteredTotalByDate = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const date of result.dates) {
      let sum = 0;
      for (const h of result.holdings) {
        if (checked.has(h.ticker)) sum += h.valueByDate[date] ?? 0;
      }
      totals[date] = sum;
    }
    return totals;
  }, [result.dates, result.holdings, checked]);

  const series = holdingMeta
    .filter((h) => checked.has(h.ticker))
    .map((h) => {
      const match = result.holdings.find((rh) => rh.ticker === h.ticker);
      return { key: h.ticker, label: match?.symbol ?? h.ticker, color: h.color };
    });

  return (
    <div className={`flex flex-col gap-6 transition-opacity ${isLoading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-md border border-border-strong text-sm">
            {(["USD", "TWD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCurrencyChange(c)}
                className={`px-3 py-1.5 transition-colors ${
                  displayCurrency === c
                    ? "bg-accent text-white"
                    : "bg-surface text-text-muted hover:text-text"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {headerActions}
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total invested" value={formatCurrency(result.totalInvested, displayCurrency)} />
        <StatTile label="Final value" value={formatCurrency(result.finalValue, displayCurrency)} />
        <StatTile
          label="Total return (incl. dividends)"
          value={formatCurrency(result.totalReturnAmount, displayCurrency)}
          tone={returnTone(result.totalReturnAmount)}
        />
        <StatTile
          label="Total return % (incl. dividends)"
          value={formatPercent(result.totalReturnPct)}
          tone={returnTone(result.totalReturnPct)}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <span className="text-xs text-text-muted">Filter holdings:</span>
          {holdingMeta.map((h) => (
            <button
              key={h.ticker}
              type="button"
              onClick={() => toggleHolding(h.ticker)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                checked.has(h.ticker)
                  ? "border-border-strong bg-surface-raised text-text"
                  : "border-border text-text-faint"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: checked.has(h.ticker) ? h.color : "#363b45" }}
              />
              {h.ticker}
            </button>
          ))}
        </div>
        <PortfolioChart
          dates={result.dates}
          totalByDate={filteredTotalByDate}
          series={series}
          valuesByKey={valuesByKey}
          displayCurrency={displayCurrency}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-text">Monthly Returns</h3>
        <MonthlyReturnTable rows={result.monthly} displayCurrency={displayCurrency} />
      </div>
    </div>
  );
}
