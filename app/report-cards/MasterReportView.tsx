"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Store } from "@/lib/types";
import type { ReportCardMetrics } from "@/lib/report-card/types";
import {
  METRIC_DIRECTIONS,
  METRIC_FORMATS,
  MONTH_NAMES_SHORT,
} from "@/lib/report-card/constants";
import type { MetricFormat } from "@/lib/report-card/constants";
import type { VarianceDirection } from "@/lib/report-card/constants";
import { getMasterReportData } from "./actions";
import { SECTIONS, formatValue } from "./ScorecardView";
import type { ScorecardSection } from "./ScorecardView";

type CompareMode = "month" | "year";

interface MasterReportViewProps {
  year: number;
  entityId?: string;
}

function formatVariance(val: number, key: string): string {
  const formatted = formatValue(val, key);
  if (formatted === "\u2014") return formatted;
  return val > 0 ? `+${formatted}` : formatted;
}

function formatPctChange(current: number, comparison: number): string {
  if (comparison === 0) return "\u2014";
  const pct = ((current - comparison) / Math.abs(comparison)) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function getVarianceColor(variance: number, key: string): string {
  const dir: VarianceDirection = METRIC_DIRECTIONS[key] ?? "neutral";
  if (dir === "neutral" || variance === 0) return "";
  const favorable =
    dir === "higher_is_better" ? variance > 0 : variance < 0;
  return favorable
    ? "text-[var(--status-matched-text)]"
    : "text-[var(--status-rti-only-text)]";
}

function MasterSection({
  section,
  stores,
  storeMetrics,
}: {
  section: ScorecardSection;
  stores: Store[];
  storeMetrics: Record<
    string,
    { current: ReportCardMetrics | null; comparison: ReportCardMetrics | null }
  >;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left bg-[var(--card)] transition-colors hover:bg-[var(--muted)]"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {section.title}
      </button>

      {open && (
        <div className="overflow-x-auto bg-[var(--card)]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-2 font-medium sticky left-0 bg-[var(--card)] z-10 min-w-[180px]">
                  Metric
                </th>
                {stores.map((store) => (
                  <th
                    key={store.id}
                    className="text-right px-3 py-2 font-medium min-w-[120px]"
                  >
                    <div>#{store.store_number}</div>
                    <div className="font-normal truncate max-w-[110px]">
                      {store.display_name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row) => {
                const fmt: MetricFormat =
                  METRIC_FORMATS[row.key] ?? "number";
                const isBoolean = fmt === "boolean";

                return (
                  <tr
                    key={row.key}
                    className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]"
                  >
                    <td
                      className={`px-4 py-1.5 sticky left-0 bg-[var(--card)] z-10 ${
                        row.indent ? "pl-8" : ""
                      }`}
                    >
                      {row.label}
                    </td>
                    {stores.map((store) => {
                      const data = storeMetrics[store.id];
                      const current = data?.current
                        ? (
                            data.current as unknown as Record<
                              string,
                              unknown
                            >
                          )[row.key]
                        : null;
                      const comparison = data?.comparison
                        ? (
                            data.comparison as unknown as Record<
                              string,
                              unknown
                            >
                          )[row.key]
                        : null;

                      const hasBoth =
                        current != null &&
                        comparison != null &&
                        !isBoolean;
                      const variance = hasBoth
                        ? Number(current) - Number(comparison)
                        : null;
                      const color =
                        variance != null
                          ? getVarianceColor(variance, row.key)
                          : "";

                      return (
                        <td
                          key={store.id}
                          className="px-3 py-1.5 text-right align-top"
                        >
                          <div className="font-mono text-xs">
                            {formatValue(current, row.key)}
                          </div>
                          {variance != null && (
                            <div
                              className={`font-mono leading-tight ${color}`}
                              style={{ fontSize: "10px" }}
                            >
                              {formatVariance(variance, row.key)}{" "}
                              {formatPctChange(
                                Number(current),
                                Number(comparison)
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function MasterReportView({ year, entityId }: MasterReportViewProps) {
  const now = new Date();
  const defaultMonth =
    year === now.getFullYear() ? now.getMonth() + 1 : 12;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [compareMode, setCompareMode] = useState<CompareMode>("year");
  const [stores, setStores] = useState<Store[]>([]);
  const [storeMetrics, setStoreMetrics] = useState<
    Record<
      string,
      {
        current: ReportCardMetrics | null;
        comparison: ReportCardMetrics | null;
      }
    >
  >({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMasterReportData(year, selectedMonth, compareMode, entityId)
      .then(({ stores: s, storeMetrics: m }) => {
        setStores(s);
        setStoreMetrics(m);
      })
      .finally(() => setLoading(false));
  }, [year, selectedMonth, compareMode, entityId]);

  // Build comparison label for the toggle description
  const compLabel =
    compareMode === "year"
      ? `vs ${MONTH_NAMES_SHORT[selectedMonth - 1]} ${year - 1}`
      : selectedMonth === 1
      ? `vs Dec ${year - 1}`
      : `vs ${MONTH_NAMES_SHORT[selectedMonth - 2]} ${year}`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <h2 className="text-lg font-semibold">Master Report — {year}</h2>

        <div className="flex items-center gap-3 ml-auto">
          {/* Month selector */}
          <div>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm"
            >
              {MONTH_NAMES_SHORT.map((name, idx) => (
                <option key={idx} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Compare toggle */}
          <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setCompareMode("month")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                compareMode === "month"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setCompareMode("year")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                compareMode === "year"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              Year
            </button>
          </div>

          <span className="text-xs text-[var(--muted-foreground)]">
            {compLabel}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-[var(--muted-foreground)] py-12">
          Loading...
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center text-[var(--muted-foreground)] py-12">
          No store data available for {MONTH_NAMES_SHORT[selectedMonth - 1]}{" "}
          {year}.
        </div>
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <MasterSection
              key={section.title}
              section={section}
              stores={stores}
              storeMetrics={storeMetrics}
            />
          ))}
        </div>
      )}
    </div>
  );
}
