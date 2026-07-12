export type Market = "US" | "TW";

export type Currency = "USD" | "TWD";

export type InvestMode = "LUMP_SUM" | "DCA";

export type DcaFrequency = "MONTHLY" | "WEEKLY";

export type DividendMode =
  | "CASH"
  | "REINVEST_FULL"
  | "REINVEST_PERCENT"
  | "REINVEST_FIXED";

export interface HoldingInput {
  ticker: string;
  market: Market;
  /** One-time amount for LUMP_SUM, per-period amount for DCA. */
  amount: number;
  amountCurrency: Currency;
  investMode: InvestMode;
  /** Only used when investMode is "DCA". */
  dcaFrequency?: DcaFrequency;
  dividendMode: DividendMode;
  /** Percent (0-100) for REINVEST_PERCENT, or fixed amount (in amountCurrency) for REINVEST_FIXED. */
  dividendModeParam?: number;
}

export interface StrategyInput {
  name: string;
  startDate: string; // ISO date (yyyy-MM-dd)
  endDate: string; // ISO date (yyyy-MM-dd)
  displayCurrency: Currency;
  holdings: HoldingInput[];
}
