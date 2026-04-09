import type { WorkBook } from "xlsx";
import type { PartialMetrics } from "../types";
import { STORE_NAME_TO_NUMBER } from "../constants";
import { getSheet, sheetToRows, toNum } from "./utils";

// Map of row labels to metric keys
const ROW_LABELS: {
  patterns: string[];
  key: keyof PartialMetrics;
  isBoolean?: boolean;
}[] = [
  { patterns: ["Shop Score 1", "Shop 1"], key: "bonus_shop_score_1" },
  { patterns: ["Shop Score 2", "Shop 2"], key: "bonus_shop_score_2" },
  { patterns: ["Shop Average", "Total SBC"], key: "bonus_shop_avg" },
  { patterns: ["Greens Fees"], key: "bonus_greens_fees_met", isBoolean: true },
  { patterns: ["Reviews completed"], key: "bonus_reviews_completed" },
  { patterns: ["TCPH Expectation"], key: "bonus_tcph_expectation" },
  { patterns: ["TPCH Actual"], key: "bonus_tcph_actual" },
  { patterns: ["Hours +/- TCPH"], key: "bonus_tcph_hours_diff" },
  { patterns: ["TPCH over Goal"], key: "bonus_tcph_goal_met", isBoolean: true },
  { patterns: ["FOB Goal"], key: "bonus_fob_goal" },
  { patterns: ["Actual FOB"], key: "bonus_fob_actual" },
  { patterns: ["Food Cost at or under"], key: "bonus_food_cost_goal_met", isBoolean: true },
  { patterns: ["Voice Surveys"], key: "bonus_voice_surveys_count" },
  { patterns: ["Drive Thru OSAT"], key: "bonus_dt_osat" },
  { patterns: ["In-Store OSAT"], key: "bonus_instore_osat" },
  { patterns: ["OSAT at 75%"], key: "bonus_osat_goal_met", isBoolean: true },
  { patterns: ["Complaints per 100K < 10"], key: "bonus_complaints_goal_met", isBoolean: true },
  { patterns: ["Complaints per 100K"], key: "bonus_complaints_per_100k" },
  { patterns: ["Crew Trainers Verified = $25"], key: "bonus_crew_trainers_goal_met", isBoolean: true },
  { patterns: ["Crew Trainers Verified"], key: "bonus_crew_trainers_count" },
  { patterns: ["Projected PACE"], key: "bonus_pace_goal_pct" },
  { patterns: ["Actual PACE"], key: "bonus_pace_actual_pct" },
  { patterns: ["Actual PACE % w/adj", "PACE w/adjustments goal met"], key: "bonus_pace_goal_met", isBoolean: true },
  { patterns: ["PACE w/adjustments", "Actual PACE % w/adj"], key: "bonus_pace_adj_pct" },
  { patterns: ["Total Monthly Points"], key: "bonus_total_points" },
];

function parseYesNo(val: unknown): boolean | null {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === "yes" || s === "y") return true;
  if (s === "no" || s === "n") return false;
  return null;
}

export function parseBonusProgram(
  wb: WorkBook,
  storeNumber: string,
  month: number
): PartialMetrics {
  const metrics: PartialMetrics = {};

  // Find the sheet with "Bonus Calculations"
  const sheet = getSheet(wb, "Bonus Calculations");
  if (!sheet) return metrics;

  const rows = sheetToRows(sheet);

  // Month column: JAN=2, FEB=3, ... DEC=13
  const monthCol = month + 1;

  // Build reverse name map for matching store sections
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

    // Check if this row starts a store section
    const isStoreHeader = targetNames.some((name) => cellVal.includes(name));
    if (isStoreHeader && sectionStart === -1) {
      sectionStart = i;
      continue;
    }

    // If we've found our section, look for the next store header to end it
    if (sectionStart !== -1) {
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

  // Process rows within the section
  // Process more specific patterns first to avoid partial matches
  const sortedLabels = [...ROW_LABELS].sort(
    (a, b) => Math.max(...b.patterns.map((p) => p.length)) - Math.max(...a.patterns.map((p) => p.length))
  );

  const assignedKeys = new Set<string>();

  for (let i = sectionStart; i < sectionEnd; i++) {
    const label = String(rows[i][0] ?? "").trim();
    if (!label) continue;

    for (const config of sortedLabels) {
      if (assignedKeys.has(config.key)) continue;

      const matches = config.patterns.some(
        (p) => label.toLowerCase().includes(p.toLowerCase())
      );
      if (!matches) continue;

      const val = rows[i][monthCol];
      if (config.isBoolean) {
        (metrics as Record<string, unknown>)[config.key] = parseYesNo(val);
      } else {
        const num = toNum(val);
        if (num != null) {
          (metrics as Record<string, unknown>)[config.key] = num;
        }
      }
      assignedKeys.add(config.key);
      break;
    }
  }

  return metrics;
}
