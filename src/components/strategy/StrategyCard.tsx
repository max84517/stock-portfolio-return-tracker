import Link from "next/link";

interface StrategyCardProps {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  tickers: string[];
}

export function StrategyCard({ id, name, startDate, endDate, tickers }: StrategyCardProps) {
  return (
    <Link
      href={`/backtest/${id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <p className="font-medium text-text">{name}</p>
      <p className="text-xs text-text-muted">
        {startDate} – {endDate}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {tickers.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border-strong px-2 py-0.5 text-xs text-text-muted"
          >
            {t}
          </span>
        ))}
      </div>
    </Link>
  );
}
