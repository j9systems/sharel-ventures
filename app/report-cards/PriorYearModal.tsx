"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { PartialMetrics } from "@/lib/report-card/types";
import { METRIC_FORMATS } from "@/lib/report-card/constants";
import { savePriorYearOverride } from "./actions";

interface PriorYearModalProps {
  storeId: string;
  year: number;
  month: number;
  existingData: PartialMetrics | null;
  onClose: () => void;
  onSave: () => void;
}

interface FieldGroup {
  title: string;
  fields: { key: string; label: string }[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    title: "Sales & TCC",
    fields: [
      { key: "all_net_sales", label: "All Net Sales" },
      { key: "product_sales", label: "Product Sales" },
      { key: "tcc", label: "Total Guest Count" },
      { key: "avg_check", label: "Avg Check" },
      { key: "breakfast_sales", label: "Breakfast Sales" },
      { key: "breakfast_tcc", label: "Breakfast TCC" },
      { key: "dt_sales", label: "Drive Thru Sales" },
      { key: "dt_tcc", label: "Drive Thru TCC" },
      { key: "kiosk_sales", label: "Kiosk Sales" },
      { key: "kiosk_tcc", label: "Kiosk TCC" },
      { key: "overnight_sales", label: "Overnight Sales" },
      { key: "in_store_sales", label: "In-Store Sales" },
    ],
  },
  {
    title: "Speed of Service",
    fields: [
      { key: "dt_oepe_daily_avg", label: "OEPE Daily Avg" },
      { key: "r2p_daily_avg", label: "R2P Daily Avg" },
      { key: "kvs_daily_avg", label: "KVS Daily Avg" },
      { key: "dt_ttl_avg", label: "DT TTL Avg" },
    ],
  },
  {
    title: "Food Cost",
    fields: [
      { key: "food_base_pct", label: "Base Food %" },
      { key: "completed_waste_pct", label: "Completed Waste %" },
      { key: "raw_waste_pct", label: "Raw Waste %" },
      { key: "food_over_base_pct", label: "Food Over Base %" },
    ],
  },
  {
    title: "Voice",
    fields: [
      { key: "voice_overall_satisfaction", label: "Overall Satisfaction" },
      { key: "voice_dt_satisfaction", label: "DT Satisfaction" },
      { key: "voice_instore_satisfaction", label: "In-Store Satisfaction" },
      { key: "voice_accuracy", label: "Accuracy" },
      { key: "voice_quality", label: "Quality" },
      { key: "voice_be_fast", label: "Speed" },
      { key: "voice_friendliness", label: "Friendliness" },
      { key: "voice_be_clean", label: "Cleanliness" },
    ],
  },
  {
    title: "QSC",
    fields: [
      { key: "shop_score_1", label: "Shop Score 1" },
      { key: "shop_score_2", label: "Shop Score 2" },
      { key: "shop_avg", label: "Shop Average" },
    ],
  },
  {
    title: "P&L",
    fields: [
      { key: "pace_actual_pct", label: "PACE %" },
      { key: "food_cost_actual_pct", label: "Food Cost %" },
      { key: "paper_cost_actual_pct", label: "Paper Cost %" },
      { key: "total_labor_actual_pct", label: "Total Labor %" },
    ],
  },
  {
    title: "Labor",
    fields: [
      { key: "grand_total_hours", label: "Grand Total Hours" },
      { key: "tpch", label: "TPCH" },
      { key: "total_labor_dollars", label: "Total Labor $" },
      { key: "overtime_hours_actual", label: "Overtime Hours" },
    ],
  },
];

export function PriorYearModal({
  storeId,
  year,
  month,
  existingData,
  onClose,
  onSave,
}: PriorYearModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (existingData) {
      for (const group of FIELD_GROUPS) {
        for (const field of group.fields) {
          const val = (existingData as Record<string, unknown>)[field.key];
          if (val != null) init[field.key] = String(val);
        }
      }
    }
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const metrics: PartialMetrics = {};
      for (const [key, val] of Object.entries(values)) {
        if (val.trim() === "") continue;
        const num = Number(val);
        if (!isNaN(num)) {
          (metrics as Record<string, unknown>)[key] = num;
        }
      }
      await savePriorYearOverride(storeId, year, month, metrics);
      onSave();
    } catch {
      // Silently handle
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Set Prior Year Data</h2>
          <button
            onClick={onClose}
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold mb-3">{group.title}</h3>
              <div className="grid grid-cols-2 gap-3">
                {group.fields.map((field) => {
                  const fmt = METRIC_FORMATS[field.key];
                  const placeholder =
                    fmt === "currency"
                      ? "$0"
                      : fmt === "percent"
                      ? "0.00"
                      : fmt === "time_sec"
                      ? "0"
                      : "0";
                  return (
                    <div key={field.key}>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder={placeholder}
                        value={values[field.key] ?? ""}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="w-full bg-[var(--input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm font-medium hover:border-[var(--primary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
