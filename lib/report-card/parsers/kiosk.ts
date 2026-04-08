import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { sheetToRows, findStoreRow, toNum, safeDivide } from "./utils";

export function parseKiosk(wb: WorkBook, storeNumber: string): PartialMetrics {
  const metrics: PartialMetrics = {};
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);
  // Row 0 = headers, rows 1+ = data
  const row = findStoreRow(rows.slice(1), storeNumber);
  if (!row) return metrics;

  metrics.kiosk_sales = toNum(row[1]);
  metrics.kiosk_pct_of_lobby_sales = toNum(row[2]);
  metrics.kiosk_tcc = toNum(row[3]);
  metrics.kiosk_pct_of_lobby_tcc = toNum(row[4]);
  metrics.kiosk_avg_check = safeDivide(toNum(row[1]), toNum(row[3]));

  return metrics;
}
