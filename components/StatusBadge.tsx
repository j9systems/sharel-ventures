import { cn } from "@/lib/cn";
import type { MatchStatus } from "@/lib/types";

const statusConfig: Record<
  MatchStatus,
  { label: string; bgVar: string; textVar: string }
> = {
  matched: {
    label: "Matched",
    bgVar: "var(--status-matched-bg)",
    textVar: "var(--status-matched-text)",
  },
  discrepancy: {
    label: "Discrepancy",
    bgVar: "var(--status-discrepancy-bg)",
    textVar: "var(--status-discrepancy-text)",
  },
  rti_only: {
    label: "Missing in Bank",
    bgVar: "var(--status-rti-only-bg)",
    textVar: "var(--status-rti-only-text)",
  },
  bank_only: {
    label: "Bank Only",
    bgVar: "var(--status-bank-only-bg)",
    textVar: "var(--status-bank-only-text)",
  },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      )}
      style={{ backgroundColor: config.bgVar, color: config.textVar }}
    >
      {config.label}
    </span>
  );
}
