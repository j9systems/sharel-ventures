import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { MONTH_NAMES } from "../constants";
import { sheetToRows, toNum } from "./utils";

export function parsePnl(
  wb: WorkBook,
  month: number,
  year: number
): PartialMetrics {
  const metrics: PartialMetrics = {};

  // Find sheet matching "January 2026", etc.
  const monthName = MONTH_NAMES[month - 1];
  const targetSheetName = `${monthName} ${year}`;
  const sheetName = wb.SheetNames.find(
    (n) => n.toLowerCase() === targetSheetName.toLowerCase()
  );
  if (!sheetName) return metrics;

  const sheet = wb.Sheets[sheetName];
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);

  // col 0 = Account code, col 1 = Label, col 2 = Current $, col 3 = Current %, col 4 = Budget $, col 5 = Budget %

  // Track labor components for total
  let crewWagesPct: number | null = null;
  let crewWagesGoalPct: number | null = null;
  let labor715Pct: number | null = null;
  let labor715GoalPct: number | null = null;
  let labor717Pct: number | null = null;
  let labor717GoalPct: number | null = null;

  for (const row of rows) {
    const code = toNum(row[0]);
    const label = String(row[1] ?? "").trim();

    if (code === 600) {
      metrics.food_cost_actual_pct = toNum(row[3]);
      metrics.food_cost_goal_pct = toNum(row[5]);
    } else if (code === 601) {
      metrics.paper_cost_actual_pct = toNum(row[3]);
      metrics.paper_cost_goal_pct = toNum(row[5]);
    } else if (code === 710) {
      crewWagesPct = toNum(row[3]);
      crewWagesGoalPct = toNum(row[5]);
    } else if (code === 715) {
      labor715Pct = toNum(row[3]);
      labor715GoalPct = toNum(row[5]);
    } else if (code === 717) {
      labor717Pct = toNum(row[3]);
      labor717GoalPct = toNum(row[5]);
    } else if (code === 725) {
      metrics.payroll_tax_actual_pct = toNum(row[3]);
      metrics.payroll_tax_goal_pct = toNum(row[5]);
    } else if (code === 745) {
      metrics.advertising_actual_pct = toNum(row[3]);
      metrics.advertising_goal_pct = toNum(row[5]);
    } else if (code === 750) {
      metrics.promotion_actual_pct = toNum(row[3]);
      metrics.promotion_goal_pct = toNum(row[5]);
    } else if (code === 755) {
      metrics.outside_service_actual_pct = toNum(row[3]);
      metrics.outside_service_goal_pct = toNum(row[5]);
    } else if (code === 760) {
      metrics.linen_actual_pct = toNum(row[3]);
      metrics.linen_goal_pct = toNum(row[5]);
    } else if (code === 765) {
      metrics.op_supply_actual_pct = toNum(row[3]);
      metrics.op_supply_goal_pct = toNum(row[5]);
    } else if (code === 770) {
      metrics.mr_actual_pct = toNum(row[3]);
      metrics.mr_goal_pct = toNum(row[5]);
    } else if (code === 775) {
      metrics.utilities_actual_pct = toNum(row[3]);
      metrics.utilities_goal_pct = toNum(row[5]);
    } else if (code === 780) {
      metrics.office_actual_pct = toNum(row[3]);
      metrics.office_goal_pct = toNum(row[5]);
    } else if (code === 594) {
      metrics.non_product_actual_pct = toNum(row[3]);
      metrics.non_product_goal_pct = toNum(row[5]);
    }

    // PACE / Gross Profit
    if (
      label.toUpperCase().includes("GROSS PROFIT") ||
      label.toUpperCase().includes("PACE")
    ) {
      const paceVal = toNum(row[3]);
      if (paceVal != null) {
        metrics.pace_actual_pct = paceVal;
      }
    }

    // Cash variance
    if (label.toUpperCase().includes("CASH")) {
      const cashVal = toNum(row[3]);
      if (cashVal != null && metrics.cash_variance_actual_pct == null) {
        metrics.cash_variance_actual_pct = cashVal;
        metrics.cash_variance_goal_pct = toNum(row[5]);
      }
    }
  }

  // Compute total labor (710 + 715 + 717)
  const laborParts = [crewWagesPct, labor715Pct, labor717Pct].filter(
    (v): v is number => v != null
  );
  if (laborParts.length > 0) {
    metrics.total_labor_actual_pct = laborParts.reduce((a, b) => a + b, 0);
  }
  const laborGoalParts = [crewWagesGoalPct, labor715GoalPct, labor717GoalPct].filter(
    (v): v is number => v != null
  );
  if (laborGoalParts.length > 0) {
    metrics.total_labor_goal_pct = laborGoalParts.reduce((a, b) => a + b, 0);
  }

  return metrics;
}
