import { PortfolioForm } from "@/components/backtest/PortfolioForm";

export default function NewBacktestPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <h1 className="text-xl font-semibold text-text">New Backtest</h1>
      <p className="mt-1 text-sm text-text-muted">
        Add the stocks you want to backtest, set an investment amount and date range, then run.
      </p>
      <div className="mt-8">
        <PortfolioForm />
      </div>
    </div>
  );
}
