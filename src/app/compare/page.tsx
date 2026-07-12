import { prisma } from "@/lib/db";
import { CompareView } from "@/components/compare/CompareView";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const strategies = await prisma.strategy.findMany({
    orderBy: { updatedAt: "desc" },
    include: { holdings: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <h1 className="text-xl font-semibold text-text">Compare Strategies</h1>
      <p className="mt-1 text-sm text-text-muted">
        Overlay saved strategies to compare asset value over time and total return.
      </p>
      <div className="mt-8">
        <CompareView
          strategies={strategies.map((s) => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate.toISOString().slice(0, 10),
            endDate: s.endDate.toISOString().slice(0, 10),
            tickers: s.holdings.map((h) => h.ticker),
          }))}
        />
      </div>
    </div>
  );
}
