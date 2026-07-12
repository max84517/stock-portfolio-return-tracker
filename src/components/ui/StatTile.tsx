interface StatTileProps {
  label: string;
  value: string;
  deltaLabel?: string;
  tone?: "positive" | "negative" | "neutral";
}

const toneClass: Record<NonNullable<StatTileProps["tone"]>, string> = {
  positive: "text-positive",
  negative: "text-negative",
  neutral: "text-text",
};

export function StatTile({ label, value, deltaLabel, tone = "neutral" }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3.5">
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${toneClass[tone]}`}>{value}</p>
      {deltaLabel && <p className={`mt-0.5 text-xs ${toneClass[tone]}`}>{deltaLabel}</p>}
    </div>
  );
}
