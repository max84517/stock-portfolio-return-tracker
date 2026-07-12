"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function StrategyHeaderActions({ strategyId }: { strategyId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this saved strategy? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/strategies/${strategyId}`, { method: "DELETE" });
      router.push("/");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/backtest/${strategyId}/edit`}
        className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text transition-colors hover:bg-surface-raised"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text-muted transition-colors hover:border-negative/40 hover:text-negative disabled:opacity-50"
      >
        {isDeleting ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
