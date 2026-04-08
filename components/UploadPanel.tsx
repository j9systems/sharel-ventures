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
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
        <h3 className="text-sm font-medium text-[#a3a3a3] mb-4">{title}</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Upload className="h-8 w-8 text-[#404040] mb-3" />
          <p className="text-sm text-[#666]">{disabledMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-6">
      <h3 className="text-sm font-medium text-[#a3a3a3] mb-4">{title}</h3>

      {selectedFile ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a]">
          <FileText className="h-5 w-5 text-[#7c3aed] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            {preview && (
              <p className="text-xs text-[#a3a3a3] mt-0.5">{preview}</p>
            )}
          </div>
          <button
            onClick={() => {
              onFileClear();
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="p-1 rounded hover:bg-[#2a2a2a] text-[#a3a3a3] hover:text-white transition-colors"
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
              ? "border-[#7c3aed] bg-[#7c3aed]/5"
              : "border-[#2a2a2a] hover:border-[#404040] hover:bg-[#1a1a1a]/50"
          )}
        >
          <Upload className="h-8 w-8 text-[#404040] mb-3" />
          <p className="text-sm text-[#a3a3a3]">
            Drop file here or{" "}
            <span className="text-[#7c3aed] font-medium">browse</span>
          </p>
          <p className="text-xs text-[#666] mt-1">{description}</p>
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
