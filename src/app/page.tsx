import Link from "next/link";
import { prisma } from "@/lib/db";
import { StrategyCard } from "@/components/strategy/StrategyCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const strategies = await prisma.strategy.findMany({
    orderBy: { updatedAt: "desc" },
    include: { holdings: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Saved Strategies</h1>
          <p className="mt-1 text-sm text-text-muted">
            Backtest and compare stock portfolio performance across US and Taiwan markets.
          </p>
        </div>
        <Link
          href="/backtest/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          New Backtest
        </Link>
      </div>

      {strategies.length === 0 ? (
        <div className="mt-10 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center">
          <p className="text-sm text-text-muted">No saved strategies yet.</p>
          <Link
            href="/backtest/new"
            className="mt-4 rounded-md border border-border-strong px-4 py-2 text-sm text-text transition-colors hover:bg-surface-raised"
          >
            Run your first backtest
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s) => (
            <StrategyCard
              key={s.id}
              id={s.id}
              name={s.name}
              startDate={s.startDate.toISOString().slice(0, 10)}
              endDate={s.endDate.toISOString().slice(0, 10)}
              tickers={s.holdings.map((h) => h.ticker)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
