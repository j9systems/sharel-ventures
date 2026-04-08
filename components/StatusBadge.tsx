import { cn } from "@/lib/cn";
import type { MatchStatus } from "@/lib/types";

const statusConfig: Record<
  MatchStatus,
  { label: string; bgClass: string; textClass: string }
> = {
  matched: {
    label: "Matched",
    bgClass: "bg-green-500/15",
    textClass: "text-green-400",
  },
  discrepancy: {
    label: "Discrepancy",
    bgClass: "bg-yellow-500/15",
    textClass: "text-yellow-400",
  },
  rti_only: {
    label: "Missing in Bank",
    bgClass: "bg-red-500/15",
    textClass: "text-red-400",
  },
  bank_only: {
    label: "Bank Only",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-400",
  },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.bgClass,
        config.textClass
      )}
    >
      {config.label}
    </span>
  );
}
