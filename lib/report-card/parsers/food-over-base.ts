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

  // Detect standalone vs Operations Report FOB sheet by checking header columns.
  // Standalone FOB: [Loc, Date, Prod Net Sales, P&L Food Cost %, Base Food %, FOB %, ...]
  // Operations Report FOB: [<blank>, <blank>, Waste, ...] then [Loc, Base Food %, Comp Waste %, ...]
  const headerRow = rows[0];
  const isStandalone =
    headerRow &&
    String(headerRow[1] ?? "")
      .toLowerCase()
      .includes("date");

  if (isStandalone) {
    // Standalone Food Over Base file — 1 header row, columns offset by Date + Prod Net Sales
    // Header: Loc(0) Date(1) ProdNetSales(2) P&LFoodCost%(3) BaseFood%(4) FOB%(5)
    //         CompWaste%(6) RawWaste%(7) Condiment%(8) EmpMeal%(9) DiscCoupon%(10)
    //         StatVar%(11) Unexplained%(12) ...dollar cols(13+)
    const row = findStoreRow(rows.slice(1), storeNumber);
    if (!row) return metrics;

    metrics.food_base_pct = toNum(row[4]);
    metrics.completed_waste_pct = toNum(row[6]);
    metrics.raw_waste_pct = toNum(row[7]);
    metrics.condiment_pct = toNum(row[8]);
    metrics.stat_loss_pct = toNum(row[11]);
    metrics.unexplained_pct = toNum(row[12]);
    metrics.food_over_base_pct = toNum(row[5]);
    metrics.food_cost_actual_pct = toNum(row[3]);
    // Paper cost not present in standalone FOB file
  } else {
    // Operations Report FOB sheet — 2 header rows
    // Header row 1: category labels; Header row 2: column names
    // Data: Loc(0) BaseFood%(1) CompWaste%(2) RawWaste%(3) RawWaste$(4)
    //       StatVar%(5) Condiment%(6) Unexplained%(7) FOB%(8) EmpMeal$(9)
    //       EmpMeal%(10) P&LFoodCost$(11) P&LFoodCost%(12) P&LPaperCost%(13) P&LPaperCost$(14)
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
  }

  return metrics;
}
