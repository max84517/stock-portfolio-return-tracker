import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toStrategyInput } from "@/lib/strategy";
import { PortfolioForm } from "@/components/backtest/PortfolioForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditStrategyPage({ params }: PageProps) {
  const { id } = await params;
  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: { holdings: true },
  });

  if (!strategy) notFound();

  const input = toStrategyInput(strategy);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-10">
      <h1 className="text-xl font-semibold text-text">Edit Strategy</h1>
      <p className="mt-1 text-sm text-text-muted">
        Adjust holdings or dates, then re-run and save to update this strategy.
      </p>
      <div className="mt-8">
        <PortfolioForm existingStrategy={{ id: strategy.id, ...input }} />
      </div>
    </div>
  );
}
