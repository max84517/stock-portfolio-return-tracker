"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Currency } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

export interface CompareSeries {
  key: string;
  label: string;
  color: string;
}

interface ComparisonChartProps {
  dates: string[];
  series: CompareSeries[];
  valuesByKey: Record<string, Record<string, number>>;
  displayCurrency: Currency;
}

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}

function formatTickDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

interface TooltipPayloadItem {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  displayCurrency,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  displayCurrency: Currency;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs text-text-muted">{label}</p>
      <div className="flex flex-col gap-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-0.5 w-3 shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium tabular-nums text-text">
              {formatCurrency(item.value, displayCurrency)}
            </span>
            <span className="text-text-muted">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComparisonChart({ dates, series, valuesByKey, displayCurrency }: ComparisonChartProps) {
  const data = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      row[s.key] = valuesByKey[s.key]?.[date] ?? 0;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#262a32" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTickDate}
          stroke="#62666f"
          tick={{ fill: "#9498a3", fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: "#262a32" }}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={formatCompact}
          stroke="#62666f"
          tick={{ fill: "#9498a3", fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: "#363b45", strokeWidth: 1 }}
          content={(props) => (
            <ChartTooltip
              active={props.active}
              label={typeof props.label === "string" ? props.label : undefined}
              payload={props.payload as unknown as TooltipPayloadItem[]}
              displayCurrency={displayCurrency}
            />
          )}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="plainline"
          wrapperStyle={{ fontSize: 12, color: "#9498a3" }}
        />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#131519" }}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
