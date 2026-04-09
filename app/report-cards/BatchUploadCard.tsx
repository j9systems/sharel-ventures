"use client";

import { useState, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Store } from "@/lib/types";
import type { UploadType, UploadStatus } from "@/lib/report-card/types";

interface BatchUploadCardProps {
  uploadType: UploadType;
  label: string;
  description: string;
  year: number;
  month: number;
  stores: Store[];
  uploadStatuses: Record<string, UploadStatus>;
  onUploadComplete: () => void;
}

export function BatchUploadCard({
  uploadType,
  label,
  description,
  year,
  month,
  stores,
  uploadStatuses,
  onUploadComplete,
}: BatchUploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: { store_number: string; error: string }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Compute aggregate status from per-store statuses
  const storeCount = stores.length;
  const completeCount = Object.values(uploadStatuses).filter(
    (s) => s === "complete"
  ).length;
  const errorCount = Object.values(uploadStatuses).filter(
    (s) => s === "error"
  ).length;

  type AggregateStatus = "complete" | "warning" | "error" | "not_uploaded";
  let aggregateStatus: AggregateStatus = "not_uploaded";
  if (completeCount > 0 && completeCount === storeCount) {
    aggregateStatus = "complete";
  } else if (completeCount > 0) {
    aggregateStatus = "warning";
  } else if (errorCount > 0 && errorCount === storeCount) {
    aggregateStatus = "error";
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("year", String(year));
      formData.set("month", String(month));
      formData.set("upload_type", uploadType);

      const res = await fetch("/api/report-cards/batch-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setResult(data);
        onUploadComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const borderColor =
    aggregateStatus === "complete"
      ? "border-l-[var(--success)]"
      : aggregateStatus === "warning"
      ? "border-l-[var(--warning)]"
      : aggregateStatus === "error"
      ? "border-l-[var(--destructive)]"
      : "border-l-[var(--border)]";

  const statusBadge = () => {
    if (uploading) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(124,58,237,0.15)] text-[var(--primary)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    }
    switch (aggregateStatus) {
      case "complete":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-matched-bg)] text-[var(--status-matched-text)]">
            <CheckCircle className="h-3 w-3" />
            {completeCount}/{storeCount} stores
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(234,179,8,0.15)] text-[var(--warning)]">
            <AlertTriangle className="h-3 w-3" />
            {completeCount}/{storeCount} stores
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-rti-only-bg)] text-[var(--status-rti-only-text)]">
            <AlertCircle className="h-3 w-3" />
            All failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
            Not Uploaded
          </span>
        );
    }
  };

  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 border-l-4 ${borderColor}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {description}
          </div>
        </div>
        {statusBadge()}
      </div>

      {/* Result summary after upload */}
      {result && (
        <div className="text-xs mb-2">
          <span
            className={
              result.failed === 0
                ? "text-[var(--success)]"
                : "text-[var(--warning)]"
            }
          >
            {result.succeeded}/{result.processed} stores updated
          </span>
          {result.errors.length > 0 && (
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="ml-2 inline-flex items-center gap-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              {showErrors ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {result.errors.length} error{result.errors.length !== 1 && "s"}
            </button>
          )}
        </div>
      )}

      {/* Expandable error list */}
      {showErrors && result?.errors && result.errors.length > 0 && (
        <div className="text-xs text-[var(--destructive)] mb-2 space-y-0.5 pl-2 border-l-2 border-[var(--destructive)]">
          {result.errors.map((err, idx) => (
            <div key={idx}>
              <span className="font-medium">#{err.store_number}:</span>{" "}
              {err.error}
            </div>
          ))}
        </div>
      )}

      {/* General error */}
      {error && (
        <div className="text-xs text-[var(--destructive)] mb-2">{error}</div>
      )}

      {/* Upload button */}
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium cursor-pointer hover:border-[var(--primary)] transition-colors">
        <Upload className="h-3.5 w-3.5" />
        {completeCount > 0 ? "Re-upload" : "Upload"}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
