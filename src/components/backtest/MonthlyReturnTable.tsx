import type { Currency } from "@/lib/types";
import { formatCurrency, formatMonth, formatPercent } from "@/lib/format";

export interface MonthlyRow {
  month: string;
  priceReturnPct: number | null;
  dividendAmount: number;
  totalReturnPct: number | null;
}

interface MonthlyReturnTableProps {
  rows: MonthlyRow[];
  displayCurrency: Currency;
}

function returnColor(value: number | null): string {
  if (value === null) return "text-text-muted";
  if (value > 0) return "text-positive";
  if (value < 0) return "text-negative";
  return "text-text-muted";
}

export function MonthlyReturnTable({ rows, displayCurrency }: MonthlyReturnTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-4 py-2.5 font-medium">Month</th>
            <th className="px-4 py-2.5 text-right font-medium">Price Return</th>
            <th className="px-4 py-2.5 text-right font-medium">Dividends</th>
            <th className="px-4 py-2.5 text-right font-medium">Total Return</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 text-text">{formatMonth(row.month)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${returnColor(row.priceReturnPct)}`}>
                {formatPercent(row.priceReturnPct)}
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">
                {formatCurrency(row.dividendAmount, displayCurrency)}
              </td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${returnColor(row.totalReturnPct)}`}>
                {formatPercent(row.totalReturnPct)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
