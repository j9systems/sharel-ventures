"use client";

interface SummaryBarProps {
  matched: number;
  discrepancies: number;
  unmatchedRti: number;
  bankOnly: number;
}

export function SummaryBar({
  matched,
  discrepancies,
  unmatchedRti,
  bankOnly,
}: SummaryBarProps) {
  const pills = [
    {
      count: matched,
      label: "Matched",
      bg: "bg-green-500/15",
      text: "text-green-400",
      border: "border-green-500/20",
    },
    {
      count: discrepancies,
      label: "Discrepancies",
      bg: "bg-yellow-500/15",
      text: "text-yellow-400",
      border: "border-yellow-500/20",
    },
    {
      count: unmatchedRti,
      label: "Unmatched",
      bg: "bg-red-500/15",
      text: "text-red-400",
      border: "border-red-500/20",
    },
    {
      count: bankOnly,
      label: "Bank Only",
      bg: "bg-blue-500/15",
      text: "text-blue-400",
      border: "border-blue-500/20",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${pill.bg} ${pill.border}`}
        >
          <span className={`text-xl font-bold ${pill.text}`}>{pill.count}</span>
          <span className="text-sm text-[var(--muted-foreground)]">{pill.label}</span>
        </div>
      ))}
    </div>
  );
}
