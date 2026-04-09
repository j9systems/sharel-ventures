export const dynamic = "force-dynamic";

import { getReconciliationSession, getReconciliationResults } from "@/app/actions";
import { getStoreDisplayNames } from "@/lib/entityDetection";
import { SummaryBar } from "@/components/SummaryBar";
import { ReconciliationTable } from "@/components/ReconciliationTable";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReconciliationPage({ params }: PageProps) {
  const { id } = await params;

  let session;
  let results;

  let storeNames: Record<string, string> = {};

  try {
    [session, results, storeNames] = await Promise.all([
      getReconciliationSession(id),
      getReconciliationResults(id),
      getStoreDisplayNames(),
    ]);
  } catch {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-[var(--muted-foreground)] mb-4">Reconciliation session not found.</p>
          <Link
            href="/"
            className="text-[var(--primary)] hover:opacity-80 text-sm"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const entities = session.entities as { name: string }[] | { name: string } | null;
  const entityName = Array.isArray(entities)
    ? entities[0]?.name ?? "Unknown"
    : entities?.name ?? "Unknown";
  const rtiUploads = session.rti_uploads as
    | { file_name: string; date_from: string; date_to: string }[]
    | { file_name: string; date_from: string; date_to: string }
    | null;
  const rtiUpload = Array.isArray(rtiUploads) ? rtiUploads[0] : rtiUploads;
  const dateRange = rtiUpload
    ? `${rtiUpload.date_from} — ${rtiUpload.date_to}`
    : "Unknown dates";

  const bankUploads = session.bank_uploads as
    | { file_name: string }[]
    | { file_name: string }
    | null;
  const bankFileNames = Array.isArray(bankUploads)
    ? bankUploads.map((b) => b.file_name)
    : bankUploads
      ? [bankUploads.file_name]
      : [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{entityName} Reconciliation</h2>
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
            matched={session.matched_count}
            discrepancies={session.discrepancy_count}
            unmatchedRti={session.unmatched_rti_count}
            bankOnly={session.unmatched_bank_count}
          />
        </div>
      </div>

      {/* Results table */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReconciliationTable results={results as any} storeNames={storeNames} />
    </div>
  );
}
