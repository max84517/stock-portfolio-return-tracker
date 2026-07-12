import { NextResponse } from "next/server";
import { runBacktestForDisplay } from "@/lib/runBacktestForDisplay";
import type { Currency, HoldingInput } from "@/lib/types";

interface BacktestRequestBody {
  startDate: string;
  endDate: string;
  displayCurrency: Currency;
  holdings: HoldingInput[];
}

export async function POST(request: Request) {
  const body = (await request.json()) as BacktestRequestBody;

  if (!body.startDate || !body.endDate || !body.holdings?.length) {
    return NextResponse.json(
      { error: "startDate, endDate, and at least one holding are required." },
      { status: 400 },
    );
  }

  try {
    const result = await runBacktestForDisplay(
      body.startDate,
      body.endDate,
      body.displayCurrency,
      body.holdings,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Backtest failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
