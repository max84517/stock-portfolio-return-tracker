"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, subYears } from "date-fns";
import { BacktestResultsView } from "./BacktestResultsView";
import { fetchBacktest, type BacktestApiResult } from "@/lib/backtestApi";
import type {
  Currency,
  DcaFrequency,
  DividendMode,
  HoldingInput,
  InvestMode,
  Market,
} from "@/lib/types";

interface HoldingRowState {
  id: string;
  ticker: string;
  market: Market;
  amount: string;
  amountCurrency: Currency;
  investMode: InvestMode;
  dcaFrequency: DcaFrequency;
  dividendMode: DividendMode;
  dividendModeParam: string;
}

function newHoldingRow(): HoldingRowState {
  return {
    id: crypto.randomUUID(),
    ticker: "",
    market: "US",
    amount: "1000",
    amountCurrency: "USD",
    investMode: "LUMP_SUM",
    dcaFrequency: "MONTHLY",
    dividendMode: "REINVEST_FULL",
    dividendModeParam: "",
  };
}

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export interface ExistingStrategy {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  displayCurrency: Currency;
  holdings: HoldingInput[];
}

interface PortfolioFormProps {
  existingStrategy?: ExistingStrategy;
}

function toRowState(h: HoldingInput): HoldingRowState {
  return {
    id: crypto.randomUUID(),
    ticker: h.ticker,
    market: h.market,
    amount: String(h.amount),
    amountCurrency: h.amountCurrency,
    investMode: h.investMode,
    dcaFrequency: h.dcaFrequency ?? "MONTHLY",
    dividendMode: h.dividendMode,
    dividendModeParam: h.dividendModeParam !== undefined ? String(h.dividendModeParam) : "",
  };
}

export function PortfolioForm({ existingStrategy }: PortfolioFormProps) {
  const router = useRouter();
  const [name, setName] = useState(existingStrategy?.name ?? "");
  const [startDate, setStartDate] = useState(
    existingStrategy?.startDate ?? format(subYears(new Date(), 1), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(existingStrategy?.endDate ?? todayISO());
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(
    existingStrategy?.displayCurrency ?? "USD",
  );
  const [rows, setRows] = useState<HoldingRowState[]>(
    existingStrategy ? existingStrategy.holdings.map(toRowState) : [newHoldingRow()],
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestApiResult | null>(null);
  const [ranHoldings, setRanHoldings] = useState<HoldingInput[]>([]);
  const [runId, setRunId] = useState(0);

  function updateRow(id: string, patch: Partial<HoldingRowState>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function toHoldingInputs(): HoldingInput[] | null {
    if (rows.length === 0) return null;
    const holdings: HoldingInput[] = [];
    for (const row of rows) {
      const ticker = row.ticker.trim().toUpperCase();
      const amount = Number(row.amount);
      if (!ticker || !Number.isFinite(amount) || amount <= 0) return null;
      const dividendModeParam =
        row.dividendMode === "REINVEST_PERCENT" || row.dividendMode === "REINVEST_FIXED"
          ? Number(row.dividendModeParam)
          : undefined;
      if (
        (row.dividendMode === "REINVEST_PERCENT" || row.dividendMode === "REINVEST_FIXED") &&
        (!Number.isFinite(dividendModeParam) || (dividendModeParam as number) < 0)
      ) {
        return null;
      }
      holdings.push({
        ticker,
        market: row.market,
        amount,
        amountCurrency: row.amountCurrency,
        investMode: row.investMode,
        dcaFrequency: row.investMode === "DCA" ? row.dcaFrequency : undefined,
        dividendMode: row.dividendMode,
        dividendModeParam,
      });
    }
    return holdings;
  }

  async function handleRun() {
    setRunError(null);
    const holdings = toHoldingInputs();
    if (!holdings) {
      setRunError("Check that every stock has a ticker and a positive amount.");
      return;
    }
    if (startDate >= endDate) {
      setRunError("Start date must be before end date.");
      return;
    }
    setIsRunning(true);
    try {
      const next = await fetchBacktest({ startDate, endDate, displayCurrency, holdings });
      setResult(next);
      setRanHoldings(holdings);
      setRunId((id) => id + 1);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Backtest failed.");
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSave() {
    if (!result || ranHoldings.length === 0) return;
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim() || "Untitled Strategy",
        startDate,
        endDate,
        displayCurrency,
        holdings: ranHoldings,
      };
      const url = existingStrategy ? `/api/strategies/${existingStrategy.id}` : "/api/strategies";
      const method = existingStrategy ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save strategy.");
      router.push(`/backtest/${data.id}`);
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Failed to save strategy.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-lg border border-border bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto_auto]">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Strategy name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled Strategy"
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Start date</span>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">End date</span>
            <input
              type="date"
              value={endDate}
              max={todayISO()}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Display currency</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            >
              <option value="USD">USD</option>
              <option value="TWD">TWD</option>
            </select>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Holdings</h2>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, newHoldingRow()])}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-raised"
          >
            Add stock
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <HoldingRow key={row.id} row={row} onChange={updateRow} onRemove={removeRow} />
          ))}
        </div>
      </div>

      {runError && (
        <p className="rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {runError}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {isRunning ? "Running backtest…" : "Run Backtest"}
        </button>
      </div>

      {result && (
        <BacktestResultsView
          key={runId}
          holdings={ranHoldings}
          startDate={startDate}
          endDate={endDate}
          initialResult={result}
          initialDisplayCurrency={displayCurrency}
          title="Results"
          headerActions={
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-raised disabled:opacity-50"
            >
              {isSaving ? "Saving…" : existingStrategy ? "Save Changes" : "Save Strategy"}
            </button>
          }
        />
      )}
    </div>
  );
}

interface HoldingRowProps {
  row: HoldingRowState;
  onChange: (id: string, patch: Partial<HoldingRowState>) => void;
  onRemove: (id: string) => void;
}

function HoldingRow({ row, onChange, onRemove }: HoldingRowProps) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[100px_90px_1fr_90px_1fr] sm:items-end">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Ticker</span>
          <input
            value={row.ticker}
            onChange={(e) => onChange(row.id, { ticker: e.target.value })}
            placeholder={row.market === "US" ? "AAPL" : "2330"}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Market</span>
          <select
            value={row.market}
            onChange={(e) => onChange(row.id, { market: e.target.value as Market })}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          >
            <option value="US">US</option>
            <option value="TW">TW</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">
            {row.investMode === "DCA" ? "Amount per period" : "Investment amount"}
          </span>
          <input
            type="number"
            min="0"
            value={row.amount}
            onChange={(e) => onChange(row.id, { amount: e.target.value })}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Currency</span>
          <select
            value={row.amountCurrency}
            onChange={(e) => onChange(row.id, { amountCurrency: e.target.value as Currency })}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          >
            <option value="USD">USD</option>
            <option value="TWD">TWD</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Investment style</span>
          <select
            value={row.investMode}
            onChange={(e) => onChange(row.id, { investMode: e.target.value as InvestMode })}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          >
            <option value="LUMP_SUM">One-time (lump sum)</option>
            <option value="DCA">Recurring (DCA)</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_120px_auto] sm:items-end">
        {row.investMode === "DCA" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Frequency</span>
            <select
              value={row.dcaFrequency}
              onChange={(e) => onChange(row.id, { dcaFrequency: e.target.value as DcaFrequency })}
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Dividend handling</span>
          <select
            value={row.dividendMode}
            onChange={(e) => onChange(row.id, { dividendMode: e.target.value as DividendMode })}
            className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
          >
            <option value="REINVEST_FULL">Reinvest fully</option>
            <option value="CASH">Hold as cash</option>
            <option value="REINVEST_PERCENT">Reinvest a %</option>
            <option value="REINVEST_FIXED">Reinvest a fixed amount</option>
          </select>
        </label>
        {row.dividendMode === "REINVEST_PERCENT" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Percent</span>
            <input
              type="number"
              min="0"
              max="100"
              value={row.dividendModeParam}
              onChange={(e) => onChange(row.id, { dividendModeParam: e.target.value })}
              placeholder="e.g. 50"
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
        )}
        {row.dividendMode === "REINVEST_FIXED" && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-text-muted">Fixed amount</span>
            <input
              type="number"
              min="0"
              value={row.dividendModeParam}
              onChange={(e) => onChange(row.id, { dividendModeParam: e.target.value })}
              placeholder={row.amountCurrency}
              className="rounded-md border border-border-strong bg-bg px-3 py-2 text-text outline-none focus:border-accent"
            />
          </label>
        )}
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="justify-self-start rounded-md border border-border-strong px-3 py-2 text-sm text-text-muted transition-colors hover:border-negative/40 hover:text-negative sm:justify-self-end"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
