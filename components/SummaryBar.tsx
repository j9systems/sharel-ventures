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
      bgVar: "var(--status-matched-bg)",
      textVar: "var(--status-matched-text)",
      borderVar: "var(--status-matched-border)",
    },
    {
      count: discrepancies,
      label: "Discrepancies",
      bgVar: "var(--status-discrepancy-bg)",
      textVar: "var(--status-discrepancy-text)",
      borderVar: "var(--status-discrepancy-border)",
    },
    {
      count: unmatchedRti,
      label: "Unmatched",
      bgVar: "var(--status-rti-only-bg)",
      textVar: "var(--status-rti-only-text)",
      borderVar: "var(--status-rti-only-border)",
    },
    {
      count: bankOnly,
      label: "Bank Only",
      bgVar: "var(--status-bank-only-bg)",
      textVar: "var(--status-bank-only-text)",
      borderVar: "var(--status-bank-only-border)",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border"
          style={{ backgroundColor: pill.bgVar, borderColor: pill.borderVar }}
        >
          <span className="text-xl font-bold" style={{ color: pill.textVar }}>{pill.count}</span>
          <span className="text-sm text-[var(--muted-foreground)]">{pill.label}</span>
        </div>
      ))}
    </div>
  );
}
