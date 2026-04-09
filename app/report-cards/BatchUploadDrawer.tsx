"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Entity, Store } from "@/lib/types";
import type { UploadType, UploadStatus } from "@/lib/report-card/types";
import { MONTH_NAMES_SHORT } from "@/lib/report-card/constants";
import { getBatchUploadStatuses } from "./actions";
import { BatchUploadPanel } from "./BatchUploadPanel";

interface BatchUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  entities: Entity[];
  stores: Store[];
  selectedEntityId: string;
  onEntityChange: (id: string) => void;
  selectedYear: number;
  onUploadComplete: () => void;
}

export function BatchUploadDrawer({
  open,
  onClose,
  entities,
  stores,
  selectedEntityId,
  onEntityChange,
  selectedYear,
  onUploadComplete,
}: BatchUploadDrawerProps) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [uploadStatuses, setUploadStatuses] = useState<
    Record<UploadType, Record<string, UploadStatus>>
  >({} as Record<UploadType, Record<string, UploadStatus>>);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset month when drawer closes (but not entity)
  useEffect(() => {
    if (!open) {
      setSelectedMonth(null);
    }
  }, [open]);

  // Load batch statuses when entity + month are selected
  const loadStatuses = useCallback(async () => {
    if (!selectedEntityId || !selectedMonth) {
      setUploadStatuses({} as Record<UploadType, Record<string, UploadStatus>>);
      return;
    }
    const data = await getBatchUploadStatuses(selectedEntityId, selectedYear, selectedMonth);
    setUploadStatuses(data);
  }, [selectedEntityId, selectedYear, selectedMonth]);

  useEffect(() => {
    loadStatuses();
  }, [loadStatuses]);

  // Handle upload complete: reload statuses + notify parent
  const handleUploadComplete = async () => {
    await loadStatuses();
    onUploadComplete();
  };

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Trap focus inside drawer when open
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open, selectedMonth, selectedEntityId]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Upload Reports"
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-[480px] bg-[var(--background)] border-l border-[var(--border)] shadow-xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold">Upload Reports</h2>
            <button
              onClick={onClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors p-1"
              aria-label="Close drawer"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* State 1: No entity selected */}
            {!selectedEntityId && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-[var(--muted-foreground)] text-sm mb-4">
                  Select an entity to upload files
                </p>
                <select
                  value={selectedEntityId}
                  onChange={(e) => onEntityChange(e.target.value)}
                  className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm w-full max-w-[280px]"
                >
                  <option value="">Choose an entity…</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* State 2: Entity selected, no month */}
            {selectedEntityId && !selectedMonth && (
              <div>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">
                  Each file contains data for all stores. Select a month, then upload each file type once.
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {MONTH_NAMES_SHORT.map((name, idx) => {
                    const m = idx + 1;
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-center transition-colors cursor-pointer hover:border-[var(--primary)]"
                      >
                        <div className="text-sm font-medium">{name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* State 3: Entity + month selected — show upload panel */}
            {selectedEntityId && selectedMonth && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-sm transition-colors"
                  >
                    &larr; Back to months
                  </button>
                  <h3 className="text-base font-semibold">
                    {MONTH_NAMES_SHORT[selectedMonth - 1]} {selectedYear}
                  </h3>
                </div>
                <BatchUploadPanel
                  entityId={selectedEntityId}
                  year={selectedYear}
                  month={selectedMonth}
                  stores={stores}
                  uploadStatuses={uploadStatuses}
                  onUploadComplete={handleUploadComplete}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
