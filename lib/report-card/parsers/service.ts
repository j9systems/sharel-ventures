import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { getSheet, sheetToRows, toNum } from "./utils";

export function parseService(
  wb: WorkBook,
  storePosition: number
): PartialMetrics {
  const metrics: PartialMetrics = {};
  const sheet = getSheet(wb, "service") ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);

  // Parse store groups: each group starts with a row where col[0] is null/blank
  // Row 0 = headers, data starts at row 1
  const groups: { overall: unknown[]; peaks: Record<string, unknown[]> }[] = [];
  let currentGroup: { overall: unknown[]; peaks: Record<string, unknown[]> } | null = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const timeSlice = String(row[0] ?? "").trim();

    if (!timeSlice) {
      // New store group starts — this row is the overall row
      if (currentGroup) {
        groups.push(currentGroup);
      }
      currentGroup = { overall: row, peaks: {} };
    } else if (currentGroup) {
      currentGroup.peaks[timeSlice.toLowerCase()] = row;
    }
  }
  if (currentGroup) {
    groups.push(currentGroup);
  }

  if (storePosition < 0 || storePosition >= groups.length) {
    return metrics;
  }

  const group = groups[storePosition];

  // Overall row
  metrics.dt_oepe_peak_avg = toNum(group.overall[1]);
  metrics.r2p_peak_avg = toNum(group.overall[2]);
  metrics.kvs_peak_avg = toNum(group.overall[3]);

  // 7am-9am
  const peak7a9a = group.peaks["7am-9am"];
  if (peak7a9a) {
    metrics.dt_oepe_peak_7a9a = toNum(peak7a9a[1]);
    metrics.r2p_peak_7a9a = toNum(peak7a9a[2]);
    metrics.kvs_peak_7a9a = toNum(peak7a9a[3]);
  }

  // 11am-2pm
  const peak11a2p = group.peaks["11am-2pm"];
  if (peak11a2p) {
    metrics.dt_oepe_peak_11a2p = toNum(peak11a2p[1]);
    metrics.r2p_peak_11a2p = toNum(peak11a2p[2]);
    metrics.kvs_peak_11a2p = toNum(peak11a2p[3]);
  }

  // 5pm-7pm
  const peak5p7p = group.peaks["5pm-7pm"];
  if (peak5p7p) {
    metrics.dt_oepe_peak_5p7p = toNum(peak5p7p[1]);
    metrics.r2p_peak_5p7p = toNum(peak5p7p[2]);
    metrics.kvs_peak_5p7p = toNum(peak5p7p[3]);
  }

  return metrics;
}
