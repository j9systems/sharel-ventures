import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { sheetToRows, toNum } from "./utils";

const MEASURE_MAP: Record<string, keyof PartialMetrics> = {
  "Overall Satisfaction": "voice_overall_satisfaction",
  "Accuracy": "voice_accuracy",
  "Overall Quality": "voice_quality",
  "Fast": "voice_be_fast",
  "Drive Thru Overall Satisfaction": "voice_dt_satisfaction",
  "Drive Thru Dissatisfaction (B2B)": "voice_dt_b2b",
  "In Restaurant Satisfaction": "voice_instore_satisfaction",
  "In Restaurant Dissatisfaction (B2B)": "voice_instore_b2b",
  "Experienced a Problem (Yes)": "voice_experienced_problem",
  "Friendliness": "voice_friendliness",
  "Overall Cleanliness": "voice_be_clean",
};

export function parseComparisonReport(
  wb: WorkBook,
  storeNumber: string
): PartialMetrics {
  const metrics: PartialMetrics = {};
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);

  // Extract store number from col 0: "01350 - EAST HENRIETTA"
  function extractStoreNumber(val: unknown): string | null {
    const s = String(val ?? "");
    const match = s.match(/^0*(\d+)/);
    return match ? match[1] : null;
  }

  // Find all rows matching this store
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    const rowStoreNum = extractStoreNumber(row[0]);
    if (rowStoreNum !== storeNumber) continue;

    const measure = String(row[1] ?? "").trim();
    const value = toNum(row[2]);

    const metricKey = MEASURE_MAP[measure];
    if (metricKey && value != null) {
      (metrics as Record<string, unknown>)[metricKey] = value;
    }

    // Survey count from "Overall Satisfaction" row, col 3
    if (measure === "Overall Satisfaction") {
      metrics.voice_survey_count = toNum(row[3]);
    }
  }

  return metrics;
}
