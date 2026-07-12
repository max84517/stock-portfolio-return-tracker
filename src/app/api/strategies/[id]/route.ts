import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toStrategyInput } from "@/lib/strategy";
import type { StrategyInput } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: { holdings: true },
  });
  if (!strategy) {
    return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
  }
  return NextResponse.json({ id: strategy.id, ...toStrategyInput(strategy) });
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const body = (await request.json()) as StrategyInput;

  if (!body.name || !body.startDate || !body.endDate || !body.holdings?.length) {
    return NextResponse.json({ error: "Missing required strategy fields." }, { status: 400 });
  }

  const existing = await prisma.strategy.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.holding.deleteMany({ where: { strategyId: id } }),
    prisma.strategy.update({
      where: { id },
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
    }),
  ]);

  return NextResponse.json({ id });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  await prisma.strategy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
