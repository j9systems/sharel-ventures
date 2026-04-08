"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface UploadPanelProps {
  title: string;
  accept: string;
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  selectedFile: File | null;
  preview?: string;
}

export function UploadPanel({
  title,
  accept,
  description,
  disabled,
  disabledMessage,
  onFileSelect,
  onFileClear,
  selectedFile,
  preview,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [disabled, onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  if (disabled) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">{disabledMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">{title}</h3>

      {selectedFile ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
          <FileText className="h-5 w-5 text-[var(--primary)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            {preview && (
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{preview}</p>
            )}
          </div>
          <button
            onClick={() => {
              onFileClear();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
            isDragOver
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-[var(--border)] hover:border-[var(--muted-foreground)] hover:bg-[var(--card)]/50"
          )}
        >
          <Upload className="h-8 w-8 text-[var(--muted-foreground)] mb-3" />
          <p className="text-sm text-[var(--muted-foreground)]">
            Drop file here or{" "}
            <span className="text-[var(--primary)] font-medium">browse</span>
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
