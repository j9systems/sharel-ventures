"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, Info } from "lucide-react";
import type { Store } from "@/lib/types";
import type { ReportCardUpload, UploadType } from "@/lib/report-card/types";

interface UploadCardProps {
  uploadType: UploadType;
  label: string;
  description: string;
  upload?: ReportCardUpload;
  storeId: string;
  year: number;
  month: number;
  stores: Store[];
  selectedStore?: Store;
  onUploadComplete: () => void;
}

export function UploadCard({
  uploadType,
  label,
  description,
  upload,
  storeId,
  year,
  month,
  stores,
  selectedStore,
  onUploadComplete,
}: UploadCardProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storePosition, setStorePosition] = useState<number>(() => {
    if (!selectedStore) return 0;
    const sorted = [...stores]
      .filter((s) => s.entity_id === selectedStore.entity_id)
      .sort((a, b) => a.store_number.localeCompare(b.store_number, undefined, { numeric: true }));
    return sorted.findIndex((s) => s.id === selectedStore.id);
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const status = upload?.status ?? "not_uploaded";

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("store_id", storeId);
      formData.set("year", String(year));
      formData.set("month", String(month));
      formData.set("upload_type", uploadType);
      if (uploadType === "service") {
        formData.set("store_position", String(storePosition));
      }

      const res = await fetch("/api/report-cards/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        onUploadComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const statusBadge = () => {
    if (uploading) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(124,58,237,0.15)] text-[var(--primary)]">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing
        </span>
      );
    }
    switch (status) {
      case "complete":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-matched-bg)] text-[var(--status-matched-text)]">
            <CheckCircle className="h-3 w-3" />
            Complete
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--status-rti-only-bg)] text-[var(--status-rti-only-text)]">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[rgba(124,58,237,0.15)] text-[var(--primary)]">
            <Loader2 className="h-3 w-3 animate-spin" />
            Processing
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
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {description}
          </div>
        </div>
        {statusBadge()}
      </div>

      {/* Service file: store position input */}
      {uploadType === "service" && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <label className="text-[var(--muted-foreground)]">
            Store position (0-indexed):
          </label>
          <input
            type="number"
            min={0}
            value={storePosition}
            onChange={(e) => setStorePosition(parseInt(e.target.value, 10) || 0)}
            className="w-16 bg-[var(--input)] border border-[var(--border)] rounded px-2 py-1 text-xs"
          />
          <span className="text-[var(--muted-foreground)] cursor-help" title="This file has no store identifiers. Stores appear in the same order as the Operations Report. Set this to your store's 0-based index in that list.">
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
      )}

      {/* Upload complete details */}
      {status === "complete" && upload && (
        <div className="text-xs text-[var(--muted-foreground)] mb-2">
          {upload.file_name} &middot;{" "}
          {new Date(upload.uploaded_at).toLocaleString()}
        </div>
      )}

      {/* Error message */}
      {(status === "error" || error) && (
        <div className="text-xs text-[var(--destructive)] mb-2">
          {error ?? upload?.error_message}
        </div>
      )}

      {/* Upload button */}
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium cursor-pointer hover:border-[var(--primary)] transition-colors">
        <Upload className="h-3.5 w-3.5" />
        {status === "complete" ? "Re-upload" : "Upload"}
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
