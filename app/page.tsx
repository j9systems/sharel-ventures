"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadPanel } from "@/components/UploadPanel";
import {
  getRecentSessions,
  uploadAndReconcileAuto,
  deleteReconciliationSession,
} from "./actions";
import { FileText, ArrowRight, Loader2, Trash2 } from "lucide-react";

type UploadInfo = { file_name: string; date_from: string; date_to: string };
type BankUploadInfo = { file_name: string };

interface RecentSession {
  id: string;
  entity_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  matched_count: number;
  discrepancy_count: number;
  unmatched_rti_count: number;
  unmatched_bank_count: number;
  total_rti_deposits: number;
  total_bank_deposits: number;
  rti_uploads: UploadInfo[] | UploadInfo | null;
  bank_uploads: BankUploadInfo[] | BankUploadInfo | null;
  entities: { name: string } | { name: string }[] | null;
}

function getRtiUpload(session: RecentSession): UploadInfo | undefined {
  if (!session.rti_uploads) return undefined;
  return Array.isArray(session.rti_uploads) ? session.rti_uploads[0] : session.rti_uploads;
}

function getBankFileNames(session: RecentSession): string[] {
  if (!session.bank_uploads) return [];
  if (Array.isArray(session.bank_uploads)) {
    return session.bank_uploads.map((b) => b.file_name);
  }
  return [session.bank_uploads.file_name];
}

function getEntityName(session: RecentSession): string {
  if (!session.entities) return "Unknown";
  if (Array.isArray(session.entities)) {
    return session.entities[0]?.name ?? "Unknown";
  }
  return session.entities.name ?? "Unknown";
}

export default function HomePage() {
  const router = useRouter();
  const [rtiFiles, setRtiFiles] = useState<File[]>([]);
  const [bankFiles, setBankFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    getRecentSessions()
      .then((data) => setRecentSessions((data as RecentSession[]) ?? []))
      .catch(() => {});
  }, []);

  const handleRtiFilesAdd = useCallback((files: File[]) => {
    setError("");
    setRtiFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleRtiFileRemove = useCallback((index: number) => {
    setRtiFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRtiFilesClear = useCallback(() => {
    setRtiFiles([]);
  }, []);

  const handleBankFilesAdd = useCallback((files: File[]) => {
    setError("");
    setBankFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const newFiles = files.filter((f) => !existingNames.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const handleBankFileRemove = useCallback((index: number) => {
    setBankFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleBankFilesClear = useCallback(() => {
    setBankFiles([]);
  }, []);

  const handleReconcile = async () => {
    if (rtiFiles.length === 0 || bankFiles.length === 0) return;
    setProcessing(true);
    setError("");

    try {
      setStatusMessage("Parsing and detecting entities...");
      await new Promise((r) => setTimeout(r, 200));

      setStatusMessage("Running reconciliation...");

      const formData = new FormData();
      rtiFiles.forEach((f) => formData.append("rtiFiles", f));
      bankFiles.forEach((f) => formData.append("bankFiles", f));

      const result = await uploadAndReconcileAuto(formData);

      if (!result.success) {
        setError(result.error);
        setProcessing(false);
        setStatusMessage("");
        return;
      }

      setStatusMessage("Complete! Redirecting...");
      if (result.sessions.length === 1) {
        router.push(`/reconciliation/${result.sessions[0].sessionId}`);
      } else {
        const ids = result.sessions.map((s) => s.sessionId).join(",");
        router.push(`/reconciliation/multi?sessions=${ids}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const canReconcile = rtiFiles.length > 0 && bankFiles.length > 0 && !processing;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Upload panels */}
      <div className="grid md:grid-cols-2 gap-6 mb-4">
        <UploadPanel
          title="RTI Deposit Export"
          accept=".csv"
          description="One or more RTI CSV exports — entity is detected automatically"
          multiple
          onFilesAdd={handleRtiFilesAdd}
          onFileRemove={handleRtiFileRemove}
          onFilesClear={handleRtiFilesClear}
          selectedFiles={rtiFiles}
          previews={rtiFiles.map((f) => f.name)}
        />
        <UploadPanel
          title="Bank Statements"
          accept=".xls,.xlsx,.csv"
          description="CNB or Five Star XLS/CSV files — entity is detected automatically"
          multiple
          onFilesAdd={handleBankFilesAdd}
          onFileRemove={handleBankFileRemove}
          onFilesClear={handleBankFilesClear}
          selectedFiles={bankFiles}
          previews={bankFiles.map((f) => f.name)}
        />
      </div>

      {(rtiFiles.length > 0 || bankFiles.length > 0) && (
        <p className="text-xs text-[var(--muted-foreground)] mb-6">
          Entity is detected automatically from store numbers in RTI files and account
          numbers in bank files. You can upload NGEN and Sharel files at the same time —
          separate reconciliation sessions will be created for each.
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Action button */}
      <div className="mb-12">
        {processing ? (
          <div className="flex items-center gap-3 px-6 py-3 rounded-lg bg-[#7c3aed]/20 border border-[#7c3aed]/30 text-[#c4b5fd]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        ) : (
          <button
            onClick={handleReconcile}
            disabled={!canReconcile}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7c3aed] text-white font-medium text-sm hover:bg-[#6d28d9] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Run Reconciliation
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recent sessions */}
      <div>
        <h2 className="text-sm font-medium text-[var(--muted-foreground)] mb-4">
          Recent Reconciliations
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] py-8 text-center">
            No reconciliations yet. Upload files above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const rti = getRtiUpload(session);
              const bankNames = getBankFileNames(session);
              const entityName = getEntityName(session);
              const bankLabel =
                bankNames.length === 0
                  ? "Unknown Bank"
                  : bankNames.length === 1
                    ? bankNames[0]
                    : `${bankNames.length} bank files`;
              return (
                <div
                  key={session.id}
                  className="flex items-center gap-2"
                >
                  <button
                    onClick={() =>
                      router.push(`/reconciliation/${session.id}`)
                    }
                    className="flex-1 flex items-center gap-4 p-4 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-[var(--muted-foreground)] transition-colors text-left"
                  >
                    <FileText className="h-5 w-5 text-[var(--primary)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {entityName} Reconciliation
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {rti?.date_from ?? "?"} —{" "}
                          {rti?.date_to ?? "?"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            session.status === "complete"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-yellow-500/15 text-yellow-400"
                          }`}
                        >
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                        {rti?.file_name ?? "Unknown RTI"} •{" "}
                        {bankLabel}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      <span className="text-green-400">
                        {session.matched_count} matched
                      </span>
                      {session.discrepancy_count > 0 && (
                        <span className="text-yellow-400">
                          {session.discrepancy_count} disc.
                        </span>
                      )}
                      {session.unmatched_rti_count > 0 && (
                        <span className="text-red-400">
                          {session.unmatched_rti_count} unmatched
                        </span>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Delete this reconciliation run? This cannot be undone.")) return;
                      try {
                        await deleteReconciliationSession(session.id);
                        setRecentSessions((prev) => prev.filter((s) => s.id !== session.id));
                      } catch {
                        setError("Failed to delete reconciliation session.");
                      }
                    }}
                    className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] hover:border-red-500/50 hover:bg-red-500/10 text-[var(--muted-foreground)] hover:text-red-400 transition-colors shrink-0"
                    title="Delete reconciliation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
