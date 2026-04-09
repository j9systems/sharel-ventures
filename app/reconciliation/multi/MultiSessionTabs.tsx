"use client";

import { useState } from "react";
import { SummaryBar } from "@/components/SummaryBar";
import { ReconciliationTable } from "@/components/ReconciliationTable";

interface TabData {
  sessionId: string;
  entityName: string;
  session: {
    matched_count: number;
    discrepancy_count: number;
    unmatched_rti_count: number;
    unmatched_bank_count: number;
    rti_uploads:
      | { file_name: string; date_from: string; date_to: string }[]
      | { file_name: string; date_from: string; date_to: string }
      | null;
    bank_uploads: { file_name: string }[] | { file_name: string } | null;
    bank_upload_ids?: string[];
  };
  results: any[];
}

interface MultiSessionTabsProps {
  tabs: TabData[];
  storeNames: Record<string, string>;
}

export function MultiSessionTabs({ tabs, storeNames }: MultiSessionTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex];

  const rtiUploads = activeTab.session.rti_uploads;
  const rtiUpload = Array.isArray(rtiUploads) ? rtiUploads[0] : rtiUploads;
  const dateRange = rtiUpload
    ? `${rtiUpload.date_from} — ${rtiUpload.date_to}`
    : "Unknown dates";

  const bankUploads = activeTab.session.bank_uploads;
  const bankFileNames = Array.isArray(bankUploads)
    ? bankUploads.map((b) => b.file_name)
    : bankUploads
      ? [bankUploads.file_name]
      : [];

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-6 border-b border-[var(--border)]">
        {tabs.map((tab, idx) => (
          <button
            key={tab.sessionId}
            onClick={() => setActiveIndex(idx)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              idx === activeIndex
                ? "border-[var(--primary)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.entityName}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold">{activeTab.entityName} Reconciliation</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{dateRange}</p>
            {bankFileNames.length > 0 && (
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {bankFileNames.length === 1
                  ? `Bank: ${bankFileNames[0]}`
                  : `${bankFileNames.length} bank statements: ${bankFileNames.join(", ")}`}
              </p>
            )}
          </div>

          <SummaryBar
            matched={activeTab.session.matched_count}
            discrepancies={activeTab.session.discrepancy_count}
            unmatchedRti={activeTab.session.unmatched_rti_count}
            bankOnly={activeTab.session.unmatched_bank_count}
          />
        </div>

        <ReconciliationTable results={activeTab.results as any} storeNames={storeNames} />
      </div>
    </div>
  );
}
