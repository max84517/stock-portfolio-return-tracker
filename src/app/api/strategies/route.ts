import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { StrategyInput } from "@/lib/types";

export async function GET() {
  const strategies = await prisma.strategy.findMany({
    orderBy: { updatedAt: "desc" },
    include: { holdings: true },
  });

  return NextResponse.json(
    strategies.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.startDate.toISOString().slice(0, 10),
      endDate: s.endDate.toISOString().slice(0, 10),
      displayCurrency: s.displayCurrency,
      tickers: s.holdings.map((h) => h.ticker),
      updatedAt: s.updatedAt.toISOString(),
    })),
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as StrategyInput;

  if (!body.name || !body.startDate || !body.endDate || !body.holdings?.length) {
    return NextResponse.json({ error: "Missing required strategy fields." }, { status: 400 });
  }

  const strategy = await prisma.strategy.create({
    data: {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      displayCurrency: body.displayCurrency,
      holdings: {
        create: body.holdings.map((h) => ({
          ticker: h.ticker,
          market: h.market,
          amount: h.amount,
          amountCurrency: h.amountCurrency,
          investMode: h.investMode,
          dcaFrequency: h.dcaFrequency,
          dividendMode: h.dividendMode,
          dividendModeParam: h.dividendModeParam,
        })),
      },
    },
  });

  return NextResponse.json({ id: strategy.id });
}
