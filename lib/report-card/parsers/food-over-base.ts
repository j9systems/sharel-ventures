import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { getSheet, sheetToRows, findStoreRow, toNum } from "./utils";

export function parseFoodOverBase(
  wb: WorkBook,
  storeNumber: string
): PartialMetrics {
  const metrics: PartialMetrics = {};

  const fobSheet = getSheet(wb, "FOB");
  if (!fobSheet) return metrics;

  const rows = sheetToRows(fobSheet);
  const row = findStoreRow(rows.slice(2), storeNumber);
  if (!row) return metrics;

  metrics.food_base_pct = toNum(row[1]);
  metrics.completed_waste_pct = toNum(row[2]);
  metrics.raw_waste_pct = toNum(row[3]);
  metrics.stat_loss_pct = toNum(row[5]);
  metrics.condiment_pct = toNum(row[6]);
  metrics.unexplained_pct = toNum(row[7]);
  metrics.food_over_base_pct = toNum(row[8]);
  metrics.food_cost_actual_pct = toNum(row[12]);
  metrics.paper_cost_actual_pct = toNum(row[13]);

  return metrics;
}
