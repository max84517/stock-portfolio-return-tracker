import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toStrategyInput } from "@/lib/strategy";
import { runBacktestForDisplay } from "@/lib/runBacktestForDisplay";
import { BacktestResultsView } from "@/components/backtest/BacktestResultsView";
import { StrategyHeaderActions } from "@/components/backtest/StrategyHeaderActions";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StrategyPage({ params }: PageProps) {
  const { id } = await params;
  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: { holdings: true },
  });

  if (!strategy) notFound();

  const input = toStrategyInput(strategy);
  const result = await runBacktestForDisplay(
    input.startDate,
    input.endDate,
    input.displayCurrency,
    input.holdings,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <p className="text-xs text-text-muted">
        {input.startDate} – {input.endDate}
      </p>
      <h1 className="mt-1 text-xl font-semibold text-text">{strategy.name}</h1>

      <div className="mt-8">
        <BacktestResultsView
          holdings={input.holdings}
          startDate={input.startDate}
          endDate={input.endDate}
          initialResult={result}
          initialDisplayCurrency={input.displayCurrency}
          title="Results"
          headerActions={<StrategyHeaderActions strategyId={strategy.id} />}
        />
      </div>
    </div>
  );
}
