import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toStrategyInput } from "@/lib/strategy";
import { runBacktestForDisplay } from "@/lib/runBacktestForDisplay";
import type { Currency } from "@/lib/types";

interface CompareRequestBody {
  strategyIds: string[];
  displayCurrency: Currency;
}

export async function POST(request: Request) {
  const body = (await request.json()) as CompareRequestBody;

  if (!body.strategyIds?.length) {
    return NextResponse.json({ error: "Select at least one strategy to compare." }, { status: 400 });
  }

  const strategies = await prisma.strategy.findMany({
    where: { id: { in: body.strategyIds } },
    include: { holdings: true },
  });

  try {
    const results = await Promise.all(
      strategies.map(async (strategy) => {
        const input = toStrategyInput(strategy);
        const backtest = await runBacktestForDisplay(
          input.startDate,
          input.endDate,
          body.displayCurrency,
          input.holdings,
        );
        return {
          id: strategy.id,
          name: strategy.name,
          startDate: input.startDate,
          endDate: input.endDate,
          dates: backtest.dates,
          totalValueByDate: backtest.totalValueByDate,
          totalInvested: backtest.totalInvested,
          finalValue: backtest.finalValue,
          totalReturnAmount: backtest.totalReturnAmount,
          totalReturnPct: backtest.totalReturnPct,
        };
      }),
    );

    return NextResponse.json({ displayCurrency: body.displayCurrency, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comparison failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
