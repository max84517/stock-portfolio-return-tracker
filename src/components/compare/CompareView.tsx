"use client";

import { useMemo, useState } from "react";
import { ComparisonChart } from "./ComparisonChart";
import { colorForIndex } from "@/lib/colors";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { Currency } from "@/lib/types";

export interface StrategySummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  tickers: string[];
}

interface CompareResultEntry {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dates: string[];
  totalValueByDate: Record<string, number>;
  totalInvested: number;
  finalValue: number;
  totalReturnAmount: number;
  totalReturnPct: number | null;
}

interface CompareResponse {
  displayCurrency: Currency;
  results: CompareResultEntry[];
  error?: string;
}

function returnTone(value: number | null): string {
  if (value === null || value === 0) return "text-text-muted";
  return value > 0 ? "text-positive" : "text-negative";
}

export function CompareView({ strategies }: { strategies: StrategySummary[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [displayCurrency, setDisplayCurrency] = useState<Currency>("USD");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCompare() {
    if (selected.size === 0) {
      setError("Select at least one strategy.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyIds: [...selected], displayCurrency }),
      });
      const data = (await res.json()) as CompareResponse;
      if (!res.ok) throw new Error(data.error ?? "Comparison failed.");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed.");
    } finally {
      setIsLoading(false);
    }
  }

  const allDates = useMemo(() => {
    if (!result) return [];
    const set = new Set<string>();
    for (const r of result.results) for (const d of r.dates) set.add(d);
    return [...set].sort();
  }, [result]);

  const series = useMemo(
    () =>
      result?.results.map((r, i) => ({ key: r.id, label: r.name, color: colorForIndex(i) })) ?? [],
    [result],
  );

  const valuesByKey = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    if (result) for (const r of result.results) map[r.id] = r.totalValueByDate;
    return map;
  }, [result]);

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Select strategies</h2>
          <div className="flex overflow-hidden rounded-md border border-border-strong text-sm">
            {(["USD", "TWD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDisplayCurrency(c)}
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
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {strategies.length === 0 && (
            <p className="text-sm text-text-muted">No saved strategies yet.</p>
          )}
          {strategies.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-surface-raised"
            >
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <div className="flex-1">
                <p className="text-sm text-text">{s.name}</p>
                <p className="text-xs text-text-muted">
                  {s.startDate} – {s.endDate} · {s.tickers.join(", ")}
                </p>
              </div>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCompare}
          disabled={isLoading}
          className="mt-4 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isLoading ? "Comparing…" : "Compare"}
        </button>

        {error && (
          <p className="mt-3 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border bg-surface p-4">
            <ComparisonChart
              dates={allDates}
              series={series}
              valuesByKey={valuesByKey}
              displayCurrency={result.displayCurrency}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
                  <th className="px-4 py-2.5 font-medium">Strategy</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total Return (incl. dividends)</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total Return % (incl. dividends)</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 text-text">{r.name}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${returnTone(r.totalReturnAmount)}`}>
                      {formatCurrency(r.totalReturnAmount, result.displayCurrency)}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${returnTone(r.totalReturnPct)}`}>
                      {formatPercent(r.totalReturnPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
