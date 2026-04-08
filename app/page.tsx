"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadPanel } from "@/components/UploadPanel";
import {
  getEntities,
  getRecentSessions,
  uploadAndReconcile,
  checkEntityBankParser,
} from "./actions";
import { FileText, ArrowRight, Loader2 } from "lucide-react";

interface Entity {
  id: string;
  name: string;
}

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
  rti_uploads: { file_name: string; date_from: string; date_to: string }[] | null;
  bank_uploads: { file_name: string }[] | null;
}

export default function HomePage() {
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [bankParserAvailable, setBankParserAvailable] = useState(true);
  const [rtiFile, setRtiFile] = useState<File | null>(null);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [rtiPreview, setRtiPreview] = useState("");
  const [bankPreview, setBankPreview] = useState("");
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);

  useEffect(() => {
    getEntities()
      .then((data) => setEntities(data ?? []))
      .catch((err) => console.error("getEntities failed:", err));
    getRecentSessions()
      .then((data) => setRecentSessions((data as RecentSession[]) ?? []))
      .catch((err) => console.error("getRecentSessions failed:", err));
  }, []);

  const handleEntityChange = useCallback(
    async (entityId: string) => {
      const entity = entities.find((e) => e.id === entityId) ?? null;
      setSelectedEntity(entity);
      setBankFile(null);
      setBankPreview("");
      setError("");

      if (entity) {
        const available = await checkEntityBankParser(entity.name);
        setBankParserAvailable(available);
      }
    },
    [entities]
  );

  const handleRtiSelect = useCallback(async (file: File) => {
    setRtiFile(file);
    setError("");
    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim()).length;
    setRtiPreview(`${lines} rows detected`);
  }, []);

  const handleBankSelect = useCallback(async (file: File) => {
    setBankFile(file);
    setError("");
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "csv") {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim()).length;
      setBankPreview(`${lines - 1} data rows (CSV)`);
    } else {
      setBankPreview(`Excel file selected`);
    }
  }, []);

  const handleReconcile = async () => {
    if (!selectedEntity || !rtiFile || !bankFile) return;
    setProcessing(true);
    setError("");

    try {
      setStatusMessage("Parsing RTI export...");
      await new Promise((r) => setTimeout(r, 200));

      setStatusMessage("Parsing bank statement...");
      await new Promise((r) => setTimeout(r, 200));

      setStatusMessage("Running reconciliation...");

      const formData = new FormData();
      formData.set("entityId", selectedEntity.id);
      formData.set("entityName", selectedEntity.name);
      formData.set("rtiFile", rtiFile);
      formData.set("bankFile", bankFile);

      const result = await uploadAndReconcile(formData);
      setStatusMessage("Complete! Redirecting...");

      router.push(`/reconciliation/${result.sessionId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setProcessing(false);
      setStatusMessage("");
    }
  };

  const canReconcile =
    selectedEntity && rtiFile && bankFile && bankParserAvailable && !processing;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Entity selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-[#a3a3a3] mb-2">
          Select Entity
        </label>
        <select
          value={selectedEntity?.id ?? ""}
          onChange={(e) => handleEntityChange(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2.5 text-sm text-[#f5f5f5] w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
        >
          <option value="">Choose entity...</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Upload panels */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <UploadPanel
          title="RTI Deposit Export"
          accept=".csv"
          description="CSV file from RTI system"
          disabled={!selectedEntity}
          disabledMessage="Select an entity first"
          onFileSelect={handleRtiSelect}
          onFileClear={() => {
            setRtiFile(null);
            setRtiPreview("");
          }}
          selectedFile={rtiFile}
          preview={rtiPreview}
        />
        <UploadPanel
          title="Bank Statement"
          accept=".xls,.xlsx,.csv"
          description="XLS, XLSX, or CSV bank export"
          disabled={!selectedEntity || !bankParserAvailable}
          disabledMessage={
            !selectedEntity
              ? "Select an entity first"
              : `${selectedEntity.name} bank parser coming soon`
          }
          onFileSelect={handleBankSelect}
          onFileClear={() => {
            setBankFile(null);
            setBankPreview("");
          }}
          selectedFile={bankFile}
          preview={bankPreview}
        />
      </div>

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
        <h2 className="text-sm font-medium text-[#a3a3a3] mb-4">
          Recent Reconciliations
        </h2>
        {recentSessions.length === 0 ? (
          <p className="text-sm text-[#666] py-8 text-center">
            No reconciliations yet. Upload files above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <button
                key={session.id}
                onClick={() =>
                  router.push(`/reconciliation/${session.id}`)
                }
                className="w-full flex items-center gap-4 p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#404040] transition-colors text-left"
              >
                <FileText className="h-5 w-5 text-[#7c3aed] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {session.rti_uploads?.[0]?.date_from ?? "?"} —{" "}
                      {session.rti_uploads?.[0]?.date_to ?? "?"}
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
                  <p className="text-xs text-[#a3a3a3] mt-0.5 truncate">
                    {session.rti_uploads?.[0]?.file_name ?? "Unknown RTI"} •{" "}
                    {session.bank_uploads?.[0]?.file_name ?? "Unknown Bank"}
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
                <ArrowRight className="h-4 w-4 text-[#404040]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
