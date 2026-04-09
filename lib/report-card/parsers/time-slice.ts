import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { getSheet, sheetToRows, findStoreRow, toNum, safeDivide } from "./utils";

export function parseTimeSlice(
  wb: WorkBook,
  storeNumber: string,
  existingAllNetSales?: number | null
): PartialMetrics {
  const metrics: PartialMetrics = {};

  // Time Slice Summary sheet (overnight window)
  const tsSheet = getSheet(wb, "Time Slice");
  if (tsSheet) {
    const rows = sheetToRows(tsSheet);
    const row = findStoreRow(rows.slice(1), storeNumber);
    if (row) {
      metrics.overnight_sales = toNum(row[1]);
    }
  }

  // In-Store sheet
  const inStoreSheet = getSheet(wb, "In-Store");
  if (inStoreSheet) {
    const rows = sheetToRows(inStoreSheet);
    const row = findStoreRow(rows.slice(1), storeNumber);
    if (row) {
      metrics.in_store_sales = toNum(row[1]);
      metrics.in_store_tcc = toNum(row[2]);
      const inStoreSales = toNum(row[1]);
      if (existingAllNetSales != null) {
        metrics.in_store_pct_of_sales = safeDivide(
          inStoreSales,
          existingAllNetSales
        );
      }
    }
  }

  return metrics;
}
