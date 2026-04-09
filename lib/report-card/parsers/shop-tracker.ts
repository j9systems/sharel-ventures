import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { MONTH_NAMES } from "../constants";
import { sheetToRows, findStoreRow, toNum } from "./utils";

export function parseShopTracker(
  wb: WorkBook,
  storeNumber: string,
  month: number
): PartialMetrics {
  const metrics: PartialMetrics = {};

  // Find sheet whose name contains the month name
  const monthName = MONTH_NAMES[month - 1];
  const sheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes(monthName.toLowerCase())
  );
  if (!sheetName) return metrics;

  const sheet = wb.Sheets[sheetName];
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);
  // Row 0 = month title, Row 1 = column headers, Rows 2+ = data
  const row = findStoreRow(rows.slice(2), storeNumber);
  if (!row) return metrics;

  metrics.shop_score_1 = toNum(row[1]);
  metrics.shop_score_2 = toNum(row[2]);
  metrics.shop_avg = toNum(row[3]);

  return metrics;
}
