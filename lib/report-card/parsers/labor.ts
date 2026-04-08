import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { STORE_NAME_TO_NUMBER } from "../constants";
import { getSheet, sheetToRows, toNum, safeDivide } from "./utils";

export function parseLabor(
  wb: WorkBook,
  storeNumber: string,
  existingAllNetSales?: number | null
): PartialMetrics {
  const metrics: PartialMetrics = {};

  const sheet = getSheet(wb, "labor");
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);

  // Build reverse name lookup
  const numberToNames: Record<string, string[]> = {};
  for (const [name, num] of Object.entries(STORE_NAME_TO_NUMBER)) {
    if (!numberToNames[num]) numberToNames[num] = [];
    numberToNames[num].push(name.toLowerCase());
  }
  const targetNames = numberToNames[storeNumber] ?? [];

  // Find the store section
  let sectionStart = -1;
  let sectionEnd = rows.length;

  for (let i = 0; i < rows.length; i++) {
    const cellVal = String(rows[i][0] ?? "").trim().toLowerCase();
    if (!cellVal) continue;

    if (sectionStart === -1) {
      if (targetNames.some((name) => cellVal.includes(name))) {
        sectionStart = i;
        continue;
      }
    } else {
      // Check if we've hit the next store
      const isAnyStore = Object.keys(STORE_NAME_TO_NUMBER).some(
        (name) => cellVal.includes(name.toLowerCase())
      );
      if (isAnyStore && !targetNames.some((n) => cellVal.includes(n))) {
        sectionEnd = i;
        break;
      }
    }
  }

  if (sectionStart === -1) return metrics;

  // Track management + salaried vacation for summing
  let mgmtVacation: number | null = null;
  let salariedMgmt: number | null = null;

  for (let i = sectionStart; i < sectionEnd; i++) {
    const label = String(rows[i][0] ?? "").trim();
    const lowerLabel = label.toLowerCase();
    const col8 = toNum(rows[i][8]);
    const col11 = toNum(rows[i][11]);

    if (lowerLabel.includes("actual hours with psl") || lowerLabel.includes("+ actual hours with psl")) {
      metrics.hours_with_psl_vacation = col8;
    } else if (lowerLabel.includes("mgmt classes") || lowerLabel.includes("- mgmt")) {
      metrics.management_classes = col8;
    } else if (lowerLabel.includes("+ transfers") || lowerLabel === "transfers") {
      metrics.hours_transferred = col8;
    } else if (lowerLabel.includes("1/2 overtime") || lowerLabel.includes("half overtime")) {
      metrics.half_overtime_hours = col8;
    } else if (lowerLabel.includes("grand total hours")) {
      metrics.grand_total_hours = col8;
    } else if (lowerLabel.includes("psl hours") || lowerLabel === "+ psl hours") {
      metrics.psl_hours = col8;
    } else if (lowerLabel.includes("crew vacation")) {
      if (lowerLabel.includes("dollar")) {
        metrics.crew_vacation_dollars = col8;
      } else {
        metrics.crew_vacation_hours = col8;
      }
    } else if (lowerLabel.includes("management vacation") || lowerLabel.includes("+ management")) {
      mgmtVacation = col8;
    } else if (lowerLabel.includes("salaried management")) {
      salariedMgmt = col8;
    } else if (lowerLabel.includes("non controllable hours")) {
      metrics.non_controllable_hours = col8;
    } else if (lowerLabel.includes("hours used w/o psl") || lowerLabel.includes("hours without psl")) {
      metrics.hours_without_psl_vacation = col8;
    } else if (lowerLabel.includes("tpch goal allowed") || lowerLabel.includes("- tpch goal")) {
      metrics.tpch_target_hours = col8;
    } else if (lowerLabel.includes("tcph allowed hours") || lowerLabel.includes("= tcph allowed")) {
      metrics.tpch_hours_diff = col8;
    } else if (lowerLabel.includes("actual tcph") || lowerLabel.includes("actual tpch")) {
      metrics.tpch = col8;
    } else if (lowerLabel.includes("paid sick leave dollar") || lowerLabel.includes("psl dollar")) {
      metrics.psl_dollars = col8;
    } else if (lowerLabel.includes("mgt/maint vacation dollar") || lowerLabel.includes("mgmt vacation dollar")) {
      metrics.mgmt_vacation_dollars = col8;
    } else if (lowerLabel.includes("actual overtime")) {
      metrics.overtime_hours_actual = col8;
    } else if (lowerLabel.includes("actual crew $") || lowerLabel === "actual crew $") {
      metrics.crew_dollars = col8;
    } else if (lowerLabel.includes("total actual labor")) {
      metrics.total_labor_dollars = col8;
    } else if (lowerLabel.includes("average hourly rate")) {
      metrics.avg_hourly_wage = col8;
    }

    // Col 11 metrics
    if (lowerLabel.includes("$ +/- saved") || lowerLabel.includes("saved")) {
      if (col11 != null) metrics.labor_diff_dollars = col11;
    }
    if (lowerLabel.includes("% +/-") && !lowerLabel.includes("tcph")) {
      if (col11 != null) metrics.labor_diff_pct = col11;
    }
    if (lowerLabel.includes("actual pnl crew %") || lowerLabel.includes("actual p&l crew")) {
      if (col11 != null) metrics.total_labor_actual_pct = col11;
    }
  }

  // Sum management + salaried for mgmt_vacation_hours
  const parts = [mgmtVacation, salariedMgmt].filter((v): v is number => v != null);
  if (parts.length > 0) {
    metrics.mgmt_vacation_hours = parts.reduce((a, b) => a + b, 0);
  }

  // Derived metrics
  if (existingAllNetSales != null) {
    metrics.sales_per_labor_hour = safeDivide(
      existingAllNetSales,
      metrics.hours_without_psl_vacation ?? null
    );
    metrics.psl_pct_of_sales = safeDivide(
      metrics.psl_dollars ?? null,
      existingAllNetSales
    );
  }

  return metrics;
}
