import { format } from "date-fns";
import type { Prisma } from "@/generated/prisma/client";
import type { Currency, HoldingInput, StrategyInput } from "@/lib/types";

type StrategyWithHoldings = Prisma.StrategyGetPayload<{ include: { holdings: true } }>;

export function toStrategyInput(strategy: StrategyWithHoldings): StrategyInput {
  return {
    name: strategy.name,
    startDate: format(strategy.startDate, "yyyy-MM-dd"),
    endDate: format(strategy.endDate, "yyyy-MM-dd"),
    displayCurrency: strategy.displayCurrency as Currency,
    holdings: strategy.holdings.map(
      (h): HoldingInput => ({
        ticker: h.ticker,
        market: h.market as HoldingInput["market"],
        amount: h.amount,
        amountCurrency: h.amountCurrency as Currency,
        investMode: h.investMode as HoldingInput["investMode"],
        dcaFrequency: (h.dcaFrequency ?? undefined) as HoldingInput["dcaFrequency"],
        dividendMode: h.dividendMode as HoldingInput["dividendMode"],
        dividendModeParam: h.dividendModeParam ?? undefined,
      }),
    ),
  };
}
