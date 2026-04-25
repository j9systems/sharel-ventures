"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReportCardMetrics, ReportCardUpload, PartialMetrics } from "@/lib/report-card/types";
import type { UploadType } from "@/lib/report-card/types";
import { METRIC_DIRECTIONS, METRIC_FORMATS } from "@/lib/report-card/constants";
import type { VarianceDirection, MetricFormat } from "@/lib/report-card/constants";

interface ScorecardViewProps {
  metrics: ReportCardMetrics | null;
  priorYear: PartialMetrics | null;
  uploads: ReportCardUpload[];
  onSetPriorYear: () => void;
}

// Section definitions
export interface MetricRow {
  label: string;
  key: string;
  indent?: boolean;
}

export interface ScorecardSection {
  title: string;
  requiredUploads: UploadType[];
  rows: MetricRow[];
}

export const SECTIONS: ScorecardSection[] = [
  {
    title: "Sales & TCC Recap",
    requiredUploads: ["operations_report", "kiosk", "time_slice"],
    rows: [
      { label: "All Net Sales", key: "all_net_sales" },
      { label: "Product Sales", key: "product_sales" },
      { label: "Total Guest Count", key: "tcc" },
      { label: "Avg Check", key: "avg_check" },
      { label: "Breakfast Sales", key: "breakfast_sales", indent: true },
      { label: "Breakfast TCC", key: "breakfast_tcc", indent: true },
      { label: "Breakfast % of Sales", key: "breakfast_pct_of_sales", indent: true },
      { label: "Breakfast Avg Check", key: "breakfast_avg_check", indent: true },
      { label: "Drive Thru Sales", key: "dt_sales", indent: true },
      { label: "Drive Thru TCC", key: "dt_tcc", indent: true },
      { label: "DT % of Sales", key: "dt_pct_of_sales", indent: true },
      { label: "DT Avg Check", key: "dt_avg_check", indent: true },
      { label: "In-Store Sales", key: "in_store_sales", indent: true },
      { label: "In-Store TCC", key: "in_store_tcc", indent: true },
      { label: "In-Store % of Sales", key: "in_store_pct_of_sales", indent: true },
      { label: "Late Night Sales", key: "overnight_sales", indent: true },
      { label: "Kiosk Sales", key: "kiosk_sales", indent: true },
      { label: "Kiosk TCC", key: "kiosk_tcc", indent: true },
      { label: "Kiosk % of Lobby Sales", key: "kiosk_pct_of_lobby_sales", indent: true },
      { label: "Kiosk % of Lobby TCC", key: "kiosk_pct_of_lobby_tcc", indent: true },
      { label: "Kiosk Avg Check", key: "kiosk_avg_check", indent: true },
      { label: "McDelivery Sales", key: "mcdelivery_sales", indent: true },
      { label: "McDelivery TCC", key: "mcdelivery_tcc", indent: true },
      { label: "McDelivery Avg Check", key: "mcdelivery_avg_check", indent: true },
      { label: "McDelivery % of Sales", key: "mcdelivery_pct_of_sales", indent: true },
      { label: "Mobile Order Sales", key: "mobile_order_sales", indent: true },
      { label: "Mobile Order TCC", key: "mobile_order_tcc", indent: true },
      { label: "Mobile Order Avg Check", key: "mobile_order_avg_check", indent: true },
      { label: "Mobile Order % of Sales", key: "mobile_order_pct_of_sales", indent: true },
    ],
  },
  {
    title: "QSC Recap",
    requiredUploads: ["shop_tracker"],
    rows: [
      { label: "Shop Score 1", key: "shop_score_1" },
      { label: "Shop Score 2", key: "shop_score_2" },
      { label: "Shop Average", key: "shop_avg" },
    ],
  },
  {
    title: "Voice / PACE Portal",
    requiredUploads: ["comparison_report"],
    rows: [
      { label: "DT Satisfaction", key: "voice_dt_satisfaction" },
      { label: "DT Dissatisfaction (B2B)", key: "voice_dt_b2b" },
      { label: "In-Store Satisfaction", key: "voice_instore_satisfaction" },
      { label: "In-Store Dissatisfaction (B2B)", key: "voice_instore_b2b" },
      { label: "Overall Satisfaction", key: "voice_overall_satisfaction" },
      { label: "Accuracy", key: "voice_accuracy" },
      { label: "Overall Quality", key: "voice_quality" },
      { label: "Speed (Fast)", key: "voice_be_fast" },
      { label: "Friendliness", key: "voice_friendliness" },
      { label: "Cleanliness", key: "voice_be_clean" },
      { label: "Experienced Problem", key: "voice_experienced_problem" },
      { label: "Survey Count", key: "voice_survey_count" },
    ],
  },
  {
    title: "Speed of Service",
    requiredUploads: ["operations_report", "service"],
    rows: [
      { label: "OEPE Daily Avg", key: "dt_oepe_daily_avg" },
      { label: "R2P Daily Avg", key: "r2p_daily_avg" },
      { label: "KVS Daily Avg", key: "kvs_daily_avg" },
      { label: "DT TTL Avg", key: "dt_ttl_avg" },
      { label: "OEPE Peak Avg", key: "dt_oepe_peak_avg" },
      { label: "R2P Peak Avg", key: "r2p_peak_avg" },
      { label: "KVS Peak Avg", key: "kvs_peak_avg" },
      { label: "OEPE 7a-9a", key: "dt_oepe_peak_7a9a", indent: true },
      { label: "R2P 7a-9a", key: "r2p_peak_7a9a", indent: true },
      { label: "KVS 7a-9a", key: "kvs_peak_7a9a", indent: true },
      { label: "OEPE 11a-2p", key: "dt_oepe_peak_11a2p", indent: true },
      { label: "R2P 11a-2p", key: "r2p_peak_11a2p", indent: true },
      { label: "KVS 11a-2p", key: "kvs_peak_11a2p", indent: true },
      { label: "OEPE 5p-7p", key: "dt_oepe_peak_5p7p", indent: true },
      { label: "R2P 5p-7p", key: "r2p_peak_5p7p", indent: true },
      { label: "KVS 5p-7p", key: "kvs_peak_5p7p", indent: true },
    ],
  },
  {
    title: "Food Cost",
    requiredUploads: ["operations_report", "food_over_base"],
    rows: [
      { label: "Base Food %", key: "food_base_pct" },
      { label: "Completed Waste %", key: "completed_waste_pct" },
      { label: "Raw Waste %", key: "raw_waste_pct" },
      { label: "Condiment %", key: "condiment_pct" },
      { label: "Stat Loss %", key: "stat_loss_pct" },
      { label: "Unexplained %", key: "unexplained_pct" },
      { label: "Food Over Base %", key: "food_over_base_pct" },
    ],
  },
  {
    title: "Labor",
    requiredUploads: ["labor"],
    rows: [
      { label: "Hours w/ PSL & Vacation", key: "hours_with_psl_vacation" },
      { label: "Management Classes", key: "management_classes" },
      { label: "Hours Transferred", key: "hours_transferred" },
      { label: "1/2 Overtime Hours", key: "half_overtime_hours" },
      { label: "Grand Total Hours", key: "grand_total_hours" },
      { label: "PSL Hours", key: "psl_hours" },
      { label: "Crew Vacation Hours", key: "crew_vacation_hours" },
      { label: "Mgmt Vacation Hours", key: "mgmt_vacation_hours" },
      { label: "Non-Controllable Hours", key: "non_controllable_hours" },
      { label: "Hours w/o PSL & Vacation", key: "hours_without_psl_vacation" },
      { label: "TPCH Target Hours", key: "tpch_target_hours" },
      { label: "TPCH Hours +/-", key: "tpch_hours_diff" },
      { label: "Actual TPCH", key: "tpch" },
      { label: "Sales per Labor Hour", key: "sales_per_labor_hour" },
      { label: "PSL Dollars", key: "psl_dollars" },
      { label: "PSL % of Sales", key: "psl_pct_of_sales" },
      { label: "Crew Vacation Dollars", key: "crew_vacation_dollars" },
      { label: "Mgmt Vacation Dollars", key: "mgmt_vacation_dollars" },
      { label: "Overtime Hours", key: "overtime_hours_actual" },
      { label: "Crew Dollars", key: "crew_dollars" },
      { label: "Total Labor Dollars", key: "total_labor_dollars" },
      { label: "Avg Hourly Wage", key: "avg_hourly_wage" },
      { label: "Labor $ +/-", key: "labor_diff_dollars" },
      { label: "Labor % +/-", key: "labor_diff_pct" },
    ],
  },
  {
    title: "P&L",
    requiredUploads: ["pnl"],
    rows: [
      { label: "PACE %", key: "pace_actual_pct" },
      { label: "Food Cost % (Actual)", key: "food_cost_actual_pct" },
      { label: "Food Cost % (Goal)", key: "food_cost_goal_pct", indent: true },
      { label: "Paper Cost % (Actual)", key: "paper_cost_actual_pct" },
      { label: "Paper Cost % (Goal)", key: "paper_cost_goal_pct", indent: true },
      { label: "Total Labor % (Actual)", key: "total_labor_actual_pct" },
      { label: "Total Labor % (Goal)", key: "total_labor_goal_pct", indent: true },
      { label: "Payroll Tax % (Actual)", key: "payroll_tax_actual_pct" },
      { label: "Payroll Tax % (Goal)", key: "payroll_tax_goal_pct", indent: true },
      { label: "Advertising % (Actual)", key: "advertising_actual_pct" },
      { label: "Advertising % (Goal)", key: "advertising_goal_pct", indent: true },
      { label: "Promotion % (Actual)", key: "promotion_actual_pct" },
      { label: "Promotion % (Goal)", key: "promotion_goal_pct", indent: true },
      { label: "Outside Services % (Actual)", key: "outside_service_actual_pct" },
      { label: "Outside Services % (Goal)", key: "outside_service_goal_pct", indent: true },
      { label: "Linen % (Actual)", key: "linen_actual_pct" },
      { label: "Linen % (Goal)", key: "linen_goal_pct", indent: true },
      { label: "Operating Supply % (Actual)", key: "op_supply_actual_pct" },
      { label: "Operating Supply % (Goal)", key: "op_supply_goal_pct", indent: true },
      { label: "Maint & Repairs % (Actual)", key: "mr_actual_pct" },
      { label: "Maint & Repairs % (Goal)", key: "mr_goal_pct", indent: true },
      { label: "Utilities % (Actual)", key: "utilities_actual_pct" },
      { label: "Utilities % (Goal)", key: "utilities_goal_pct", indent: true },
      { label: "Office % (Actual)", key: "office_actual_pct" },
      { label: "Office % (Goal)", key: "office_goal_pct", indent: true },
      { label: "Non-Product % (Actual)", key: "non_product_actual_pct" },
      { label: "Non-Product % (Goal)", key: "non_product_goal_pct", indent: true },
      { label: "Cash Variance % (Actual)", key: "cash_variance_actual_pct" },
      { label: "Cash Variance % (Goal)", key: "cash_variance_goal_pct", indent: true },
    ],
  },
  {
    title: "Bonus Program",
    requiredUploads: ["bonus_program"],
    rows: [
      { label: "Shop Score 1", key: "bonus_shop_score_1" },
      { label: "Shop Score 2", key: "bonus_shop_score_2" },
      { label: "Shop Average", key: "bonus_shop_avg" },
      { label: "Greens Fees Met", key: "bonus_greens_fees_met" },
      { label: "Reviews Completed", key: "bonus_reviews_completed" },
      { label: "TCPH Expectation", key: "bonus_tcph_expectation" },
      { label: "TCPH Actual", key: "bonus_tcph_actual" },
      { label: "TCPH Hours +/-", key: "bonus_tcph_hours_diff" },
      { label: "TCPH Goal Met", key: "bonus_tcph_goal_met" },
      { label: "FOB Goal", key: "bonus_fob_goal" },
      { label: "FOB Actual", key: "bonus_fob_actual" },
      { label: "Food Cost Goal Met", key: "bonus_food_cost_goal_met" },
      { label: "Voice Surveys Count", key: "bonus_voice_surveys_count" },
      { label: "DT OSAT", key: "bonus_dt_osat" },
      { label: "In-Store OSAT", key: "bonus_instore_osat" },
      { label: "OSAT Goal Met", key: "bonus_osat_goal_met" },
      { label: "Complaints per 100K", key: "bonus_complaints_per_100k" },
      { label: "Complaints Goal Met", key: "bonus_complaints_goal_met" },
      { label: "Crew Trainers Count", key: "bonus_crew_trainers_count" },
      { label: "Crew Trainers Goal Met", key: "bonus_crew_trainers_goal_met" },
      { label: "PACE Goal %", key: "bonus_pace_goal_pct" },
      { label: "PACE Actual %", key: "bonus_pace_actual_pct" },
      { label: "PACE Adjusted %", key: "bonus_pace_adj_pct" },
      { label: "PACE Goal Met", key: "bonus_pace_goal_met" },
      { label: "Total Monthly Points", key: "bonus_total_points" },
    ],
  },
];

export function formatValue(val: unknown, key: string): string {
  if (val == null) return "—";
  const fmt: MetricFormat = METRIC_FORMATS[key] ?? "number";

  switch (fmt) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(val));
    case "currency_precise":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(val));
    case "percent":
      return `${(Number(val) * (Math.abs(Number(val)) <= 1 ? 100 : 1)).toFixed(2)}%`;
    case "time_sec":
      return `${Math.round(Number(val))} sec`;
    case "boolean":
      return val === true ? "Yes" : val === false ? "No" : "—";
    default:
      return typeof val === "number"
        ? val.toLocaleString("en-US", { maximumFractionDigits: 2 })
        : String(val);
  }
}

function getVarianceColor(
  current: unknown,
  prior: unknown,
  key: string
): string {
  if (current == null || prior == null) return "";
  const dir: VarianceDirection = METRIC_DIRECTIONS[key] ?? "neutral";
  if (dir === "neutral") return "";

  const diff = Number(current) - Number(prior);
  if (diff === 0) return "";

  const favorable =
    dir === "higher_is_better" ? diff > 0 : diff < 0;
  return favorable
    ? "text-[var(--status-matched-text)]"
    : "text-[var(--status-rti-only-text)]";
}

function CollapsibleSection({
  section,
  metrics,
  priorYear,
  isAvailable,
}: {
  section: ScorecardSection;
  metrics: ReportCardMetrics | null;
  priorYear: PartialMetrics | null;
  isAvailable: boolean;
}) {
  const [open, setOpen] = useState(true);

  const hasAnyData = isAvailable && metrics && section.rows.some(
    (r) => (metrics as unknown as Record<string, unknown>)[r.key] != null
  );

  return (
    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-left transition-colors ${
          hasAnyData
            ? "bg-[rgba(34,197,94,0.06)] border-b border-[rgba(34,197,94,0.15)]"
            : "bg-[var(--card)]"
        }`}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {section.title}
        {!isAvailable && (
          <span className="ml-auto text-xs text-[var(--muted-foreground)] font-normal">
            Not yet uploaded
          </span>
        )}
      </button>

      {open && (
        <div className="bg-[var(--card)]">
          {!isAvailable ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
              Upload the required file(s) to populate this section.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left px-4 py-2 font-medium">Metric</th>
                  <th className="text-right px-4 py-2 font-medium">Current</th>
                  <th className="text-right px-4 py-2 font-medium">Prior Year</th>
                  <th className="text-right px-4 py-2 font-medium">Variance</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row) => {
                  const current = metrics
                    ? (metrics as unknown as Record<string, unknown>)[row.key]
                    : null;
                  const prior = priorYear
                    ? (priorYear as unknown as Record<string, unknown>)[row.key]
                    : null;
                  const variance =
                    current != null && prior != null
                      ? Number(current) - Number(prior)
                      : null;
                  const varianceColor = getVarianceColor(
                    current,
                    prior,
                    row.key
                  );

                  return (
                    <tr
                      key={row.key}
                      className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--muted)]"
                    >
                      <td
                        className={`px-4 py-1.5 ${
                          row.indent ? "pl-8" : ""
                        }`}
                      >
                        {row.label}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-xs">
                        {formatValue(current, row.key)}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-xs text-[var(--muted-foreground)]">
                        {formatValue(prior, row.key)}
                      </td>
                      <td
                        className={`px-4 py-1.5 text-right font-mono text-xs ${varianceColor}`}
                      >
                        {variance != null
                          ? formatValue(variance, row.key)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function ScorecardView({
  metrics,
  priorYear,
  uploads,
  onSetPriorYear,
}: ScorecardViewProps) {
  const uploadTypeSet = new Set(
    uploads.filter((u) => u.status === "complete").map((u) => u.upload_type)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Scorecard</h3>
        {!priorYear && (
          <button
            onClick={onSetPriorYear}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium hover:border-[var(--primary)] transition-colors"
          >
            Set Prior Year Data
          </button>
        )}
      </div>

      {SECTIONS.map((section) => {
        const isAvailable = section.requiredUploads.some((ut) =>
          uploadTypeSet.has(ut)
        );
        return (
          <CollapsibleSection
            key={section.title}
            section={section}
            metrics={metrics}
            priorYear={priorYear}
            isAvailable={isAvailable}
          />
        );
      })}
    </div>
  );
}
