"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SingleFileProps {
  multiple?: false;
  onFileSelect: (file: File) => void;
  onFileClear: () => void;
  selectedFile: File | null;
  preview?: string;
  selectedFiles?: never;
  previews?: never;
  onFilesAdd?: never;
  onFileRemove?: never;
  onFilesClear?: never;
}

interface MultiFileProps {
  multiple: true;
  onFilesAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onFilesClear: () => void;
  selectedFiles: File[];
  previews: string[];
  onFileSelect?: never;
  onFileClear?: never;
  selectedFile?: never;
  preview?: never;
}

type UploadPanelProps = {
  title: string;
  accept: string;
  description: string;
  disabled?: boolean;
  disabledMessage?: string;
} & (SingleFileProps | MultiFileProps);

export function UploadPanel(props: UploadPanelProps) {
  const {
    title,
    accept,
    description,
    disabled,
    disabledMessage,
    multiple,
  } = props;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length === 0) return;
      if (multiple) {
        props.onFilesAdd(files);
      } else {
        props.onFileSelect(files[0]);
      }
    },
    [disabled, multiple, props]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      if (multiple) {
        props.onFilesAdd(files);
      } else {
        props.onFileSelect(files[0]);
      }
      // Reset input so re-selecting the same file triggers onChange
      if (inputRef.current) inputRef.current.value = "";
    },
    [multiple, props]
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

  const hasFiles = multiple
    ? props.selectedFiles.length > 0
    : props.selectedFile !== null;

  const dropZone = (
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
          : "border-[var(--border)] hover:border-[var(--muted-foreground)] hover:bg-[var(--card)]/50",
        multiple && hasFiles && "py-4"
      )}
    >
      <Upload className={cn("text-[var(--muted-foreground)]", multiple && hasFiles ? "h-5 w-5 mb-1" : "h-8 w-8 mb-3")} />
      <p className="text-sm text-[var(--muted-foreground)]">
        {multiple && hasFiles ? "Drop more files or " : "Drop file here or "}
        <span className="text-[var(--primary)] font-medium">browse</span>
      </p>
      {!(multiple && hasFiles) && (
        <p className="text-xs text-[var(--muted-foreground)] mt-1">{description}</p>
      )}
    </div>
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[var(--muted-foreground)]">{title}</h3>
        {multiple && hasFiles && (
          <button
            onClick={() => props.onFilesClear()}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {multiple ? (
        <>
          {props.selectedFiles.length > 0 && (
            <div className="space-y-2 mb-3">
              {props.selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                >
                  <FileText className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    {props.previews[idx] && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {props.previews[idx]}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => props.onFileRemove(idx)}
                    className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {dropZone}
        </>
      ) : (
        <>
          {props.selectedFile ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[var(--background)] border border-[var(--border)]">
              <FileText className="h-5 w-5 text-[var(--primary)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{props.selectedFile.name}</p>
                {props.preview && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{props.preview}</p>
                )}
              </div>
              <button
                onClick={() => {
                  props.onFileClear();
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            dropZone
          )}
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={!!multiple}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
