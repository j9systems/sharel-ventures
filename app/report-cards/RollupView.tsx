"use client";

import type { Store } from "@/lib/types";
import type { ReportCardMonth, ReportCardMetrics } from "@/lib/report-card/types";

interface RollupViewProps {
  data: {
    store: Store;
    months: (ReportCardMonth & { metrics: ReportCardMetrics | null })[];
  }[];
  year: number;
  onSelectStore: (storeId: string) => void;
}

function latestMetrics(
  months: (ReportCardMonth & { metrics: ReportCardMetrics | null })[]
): ReportCardMetrics | null {
  // Find the most recent month with metrics
  const sorted = [...months]
    .filter((m) => m.metrics)
    .sort((a, b) => b.month - a.month);
  return sorted[0]?.metrics ?? null;
}

function fmtCurrency(val: number | null): string {
  if (val == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtPct(val: number | null): string {
  if (val == null) return "—";
  const display = Math.abs(val) <= 1 ? val * 100 : val;
  return `${display.toFixed(2)}%`;
}

function fmtSec(val: number | null): string {
  if (val == null) return "—";
  return `${Math.round(val)} sec`;
}

export function RollupView({ data, year, onSelectStore }: RollupViewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-[var(--muted-foreground)] py-12">
        No store data available for {year}.
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">
        Store Rollup — {year}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <th className="text-left px-4 py-2 font-medium">Store</th>
              <th className="text-left px-4 py-2 font-medium">#</th>
              <th className="text-right px-4 py-2 font-medium">Months</th>
              <th className="text-right px-4 py-2 font-medium">All Net Sales</th>
              <th className="text-right px-4 py-2 font-medium">PACE %</th>
              <th className="text-right px-4 py-2 font-medium">Food Cost %</th>
              <th className="text-right px-4 py-2 font-medium">OEPE</th>
              <th className="text-right px-4 py-2 font-medium">Voice Overall</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ store, months }) => {
              const m = latestMetrics(months);
              const completedMonths = months.filter(
                (mo) => mo.status === "complete"
              ).length;
              const totalMonths = months.length;

              return (
                <tr
                  key={store.id}
                  onClick={() => onSelectStore(store.id)}
                  className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--muted)] transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">
                    {store.display_name}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--muted-foreground)]">
                    {store.store_number}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {totalMonths > 0 ? (
                      <span>
                        {completedMonths}/{totalMonths}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {fmtCurrency(m?.all_net_sales ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {fmtPct(m?.pace_actual_pct ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {fmtPct(m?.food_cost_actual_pct ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {fmtSec(m?.dt_oepe_daily_avg ?? null)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {fmtPct(m?.voice_overall_satisfaction ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
