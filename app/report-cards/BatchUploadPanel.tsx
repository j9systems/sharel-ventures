"use client";

import type { Store } from "@/lib/types";
import type { UploadType, UploadStatus } from "@/lib/report-card/types";
import { UPLOAD_TYPES } from "@/lib/report-card/constants";
import { BatchUploadCard } from "./BatchUploadCard";

interface BatchUploadPanelProps {
  entityId: string;
  year: number;
  month: number;
  stores: Store[];
  uploadStatuses: Record<UploadType, Record<string, UploadStatus>>;
  onUploadComplete: () => void;
}

export function BatchUploadPanel({
  entityId,
  year,
  month,
  stores,
  uploadStatuses,
  onUploadComplete,
}: BatchUploadPanelProps) {
  // Count file types where at least one store has status "complete"
  const typesUploaded = UPLOAD_TYPES.filter((ut) => {
    const statuses = uploadStatuses[ut.type];
    if (!statuses) return false;
    return Object.values(statuses).some((s) => s === "complete");
  }).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-[var(--muted-foreground)]">
          {typesUploaded}/10 file types uploaded
        </div>
        <div className="w-32 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--success)] transition-all"
            style={{ width: `${(typesUploaded / 10) * 100}%` }}
          />
        </div>
      </div>
      <div className="space-y-3">
        {UPLOAD_TYPES.map((ut) => (
          <BatchUploadCard
            key={ut.type}
            uploadType={ut.type}
            label={ut.label}
            description={ut.description}
            entityId={entityId}
            year={year}
            month={month}
            stores={stores}
            uploadStatuses={uploadStatuses[ut.type] ?? {}}
            onUploadComplete={onUploadComplete}
          />
        ))}
      </div>
    </div>
  );
}
