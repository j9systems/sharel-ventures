"use client";

import { useState, useEffect, useCallback } from "react";
import type { Entity, Store } from "@/lib/types";
import type { ReportCardMonth, ReportCardUpload, ReportCardMetrics, PartialMetrics } from "@/lib/report-card/types";
import { MONTH_NAMES_SHORT, UPLOAD_TYPES } from "@/lib/report-card/constants";
import {
  getEntities,
  getStores,
  getReportCardMonths,
  getReportCardUploads,
  getReportCardMetrics,
  getPriorYearMetrics,
  getRollupData,
} from "./actions";
import { UploadCard } from "./UploadCard";
import { ScorecardView } from "./ScorecardView";
import { RollupView } from "./RollupView";
import { PriorYearModal } from "./PriorYearModal";

export default function ReportCardsPage() {
  const currentYear = new Date().getFullYear();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [months, setMonths] = useState<ReportCardMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Detail panel state
  const [uploads, setUploads] = useState<ReportCardUpload[]>([]);
  const [metrics, setMetrics] = useState<ReportCardMetrics | null>(null);
  const [priorYear, setPriorYear] = useState<PartialMetrics | null>(null);
  const [showPriorYearModal, setShowPriorYearModal] = useState(false);

  // Rollup
  const [rollupData, setRollupData] = useState<
    { store: Store; months: (ReportCardMonth & { metrics: ReportCardMetrics | null })[] }[]
  >([]);

  // Load entities
  useEffect(() => {
    getEntities().then(setEntities);
  }, []);

  // Load stores when entity changes
  useEffect(() => {
    getStores(selectedEntityId || undefined).then((s) => {
      setStores(s);
      setSelectedStoreId("");
      setSelectedMonth(null);
    });
  }, [selectedEntityId]);

  // Load months when store/year changes
  const loadMonths = useCallback(async () => {
    if (!selectedStoreId) {
      setMonths([]);
      return;
    }
    const data = await getReportCardMonths(selectedStoreId, selectedYear);
    setMonths(data);
  }, [selectedStoreId, selectedYear]);

  useEffect(() => {
    loadMonths();
  }, [loadMonths]);

  // Load detail data when month is selected
  const loadMonthDetail = useCallback(async () => {
    if (!selectedMonth || !selectedStoreId) {
      setUploads([]);
      setMetrics(null);
      setPriorYear(null);
      return;
    }
    const monthRecord = months.find((m) => m.month === selectedMonth);
    if (monthRecord) {
      const [uploadsData, metricsData, priorData] = await Promise.all([
        getReportCardUploads(monthRecord.id),
        getReportCardMetrics(monthRecord.id),
        getPriorYearMetrics(selectedStoreId, selectedYear, selectedMonth),
      ]);
      setUploads(uploadsData);
      setMetrics(metricsData);
      setPriorYear(priorData);
    } else {
      setUploads([]);
      setMetrics(null);
      const priorData = await getPriorYearMetrics(
        selectedStoreId,
        selectedYear,
        selectedMonth
      );
      setPriorYear(priorData);
    }
  }, [selectedMonth, selectedStoreId, selectedYear, months]);

  useEffect(() => {
    loadMonthDetail();
  }, [loadMonthDetail]);

  // Load rollup data when no store selected
  useEffect(() => {
    if (!selectedStoreId) {
      getRollupData(selectedYear, selectedEntityId || undefined).then(setRollupData);
    }
  }, [selectedStoreId, selectedYear, selectedEntityId]);

  const handleUploadComplete = async () => {
    await loadMonths();
    await loadMonthDetail();
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);
  const monthRecord = months.find((m) => m.month === selectedMonth);
  const completedUploads = uploads.filter((u) => u.status === "complete").length;

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(Number(e.target.value));
              setSelectedMonth(null);
            }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Entity
          </label>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Entities</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[var(--muted-foreground)] mb-1">
            Store
          </label>
          <select
            value={selectedStoreId}
            onChange={(e) => {
              setSelectedStoreId(e.target.value);
              setSelectedMonth(null);
            }}
            className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.store_number} — {s.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* No store selected — show rollup */}
      {!selectedStoreId && (
        <RollupView
          data={rollupData}
          year={selectedYear}
          onSelectStore={(storeId) => {
            setSelectedStoreId(storeId);
            setSelectedMonth(null);
          }}
        />
      )}

      {/* Store selected — show month grid */}
      {selectedStoreId && !selectedMonth && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {selectedStore?.display_name} — #{selectedStore?.store_number} — {selectedYear}
          </h2>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
            {MONTH_NAMES_SHORT.map((name, idx) => {
              const m = idx + 1;
              const monthData = months.find((mo) => mo.month === m);
              const status = monthData?.status ?? "empty";
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`
                    rounded-lg border p-3 text-center transition-colors cursor-pointer
                    ${
                      status === "complete"
                        ? "border-[var(--success)] bg-[rgba(34,197,94,0.1)]"
                        : status === "partial"
                        ? "border-[var(--warning)] bg-[rgba(234,179,8,0.08)]"
                        : "border-[var(--border)] bg-[var(--card)]"
                    }
                    hover:border-[var(--primary)]
                  `}
                >
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-1">
                    {status === "complete"
                      ? "Complete"
                      : status === "partial"
                      ? "Partial"
                      : "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Month selected — show upload panel + scorecard */}
      {selectedStoreId && selectedMonth && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedMonth(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm transition-colors"
              >
                &larr; Back to months
              </button>
              <h2 className="text-lg font-semibold">
                {selectedStore?.display_name} — {MONTH_NAMES_SHORT[selectedMonth - 1]}{" "}
                {selectedYear}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-[var(--muted-foreground)]">
                {completedUploads}/10 files uploaded
              </div>
              <div className="w-32 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--success)] transition-all"
                  style={{ width: `${(completedUploads / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
            {/* Left: Upload Panel */}
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {UPLOAD_TYPES.map((ut) => {
                const upload = uploads.find((u) => u.upload_type === ut.type);
                return (
                  <UploadCard
                    key={ut.type}
                    uploadType={ut.type}
                    label={ut.label}
                    description={ut.description}
                    upload={upload}
                    storeId={selectedStoreId}
                    year={selectedYear}
                    month={selectedMonth}
                    stores={stores}
                    selectedStore={selectedStore}
                    onUploadComplete={handleUploadComplete}
                  />
                );
              })}
            </div>

            {/* Right: Scorecard */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <ScorecardView
                metrics={metrics}
                priorYear={priorYear}
                uploads={uploads}
                onSetPriorYear={() => setShowPriorYearModal(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Prior Year Modal */}
      {showPriorYearModal && selectedStoreId && selectedMonth && (
        <PriorYearModal
          storeId={selectedStoreId}
          year={selectedYear}
          month={selectedMonth}
          existingData={priorYear}
          onClose={() => setShowPriorYearModal(false)}
          onSave={async () => {
            setShowPriorYearModal(false);
            await loadMonthDetail();
          }}
        />
      )}
    </div>
  );
}
