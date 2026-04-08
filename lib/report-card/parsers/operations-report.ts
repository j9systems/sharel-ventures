import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { getSheet, sheetToRows, findStoreRow, toNum, safeDivide } from "./utils";

export function parseOperationsReport(
  wb: WorkBook,
  storeNumber: string
): PartialMetrics {
  const metrics: PartialMetrics = {};

  // Sales sheet
  const salesSheet = getSheet(wb, "Sales");
  if (salesSheet) {
    const rows = sheetToRows(salesSheet);
    const row = findStoreRow(rows.slice(2), storeNumber);
    if (row) {
      metrics.all_net_sales = toNum(row[1]);
      metrics.product_sales = toNum(row[3]);
      metrics.avg_check = toNum(row[4]);
      metrics.tcc = toNum(row[5]);
      metrics.breakfast_sales = toNum(row[9]);
      metrics.breakfast_tcc = toNum(row[10]);
      metrics.breakfast_pct_of_sales = toNum(row[7]);
      metrics.breakfast_avg_check = safeDivide(
        toNum(row[9]),
        toNum(row[10])
      );
      metrics.dt_pct_of_sales = toNum(row[12]);
      metrics.dt_avg_check = toNum(row[13]);
      metrics.dt_tcc = toNum(row[14]);
      metrics.dt_sales = toNum(row[15]);
      metrics.mcdelivery_tcc = toNum(row[17]);
      metrics.mcdelivery_sales = toNum(row[18]);
      metrics.mcdelivery_avg_check = safeDivide(
        toNum(row[18]),
        toNum(row[17])
      );
      metrics.mcdelivery_pct_of_sales = safeDivide(
        toNum(row[18]),
        toNum(row[1])
      );
      metrics.mobile_order_sales = toNum(row[21]);
      metrics.mobile_order_tcc = toNum(row[22]);
      metrics.mobile_order_avg_check = safeDivide(
        toNum(row[21]),
        toNum(row[22])
      );
      metrics.mobile_order_pct_of_sales = safeDivide(
        toNum(row[21]),
        toNum(row[1])
      );
      metrics.kiosk_avg_check = toNum(row[23]);
    }
  }

  // Service sheet
  const serviceSheet = getSheet(wb, "Service");
  if (serviceSheet) {
    const rows = sheetToRows(serviceSheet);
    const row = findStoreRow(rows.slice(2), storeNumber);
    if (row) {
      metrics.kvs_daily_avg = toNum(row[2]);
      metrics.r2p_daily_avg = toNum(row[3]);
      metrics.dt_oepe_daily_avg = toNum(row[4]);
      metrics.dt_ttl_avg = toNum(row[6]);
    }
  }

  // FOB sheet
  const fobSheet = getSheet(wb, "FOB");
  if (fobSheet) {
    const rows = sheetToRows(fobSheet);
    const row = findStoreRow(rows.slice(2), storeNumber);
    if (row) {
      metrics.food_base_pct = toNum(row[1]);
      metrics.completed_waste_pct = toNum(row[2]);
      metrics.raw_waste_pct = toNum(row[3]);
      metrics.stat_loss_pct = toNum(row[5]);
      metrics.condiment_pct = toNum(row[6]);
      metrics.unexplained_pct = toNum(row[7]);
      metrics.food_over_base_pct = toNum(row[8]);
      metrics.food_cost_actual_pct = toNum(row[12]);
      metrics.paper_cost_actual_pct = toNum(row[13]);
    }
  }

  return metrics;
}
