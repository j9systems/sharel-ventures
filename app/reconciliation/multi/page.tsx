export const dynamic = "force-dynamic";

import { getReconciliationSession, getReconciliationResults } from "@/app/actions";
import { getStoreDisplayNames } from "@/lib/entityDetection";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MultiSessionTabs } from "./MultiSessionTabs";

interface PageProps {
  searchParams: Promise<{ sessions?: string }>;
}

export default async function MultiReconciliationPage({ searchParams }: PageProps) {
  const { sessions: sessionsParam } = await searchParams;

  if (!sessionsParam) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-[var(--muted-foreground)] mb-4">No sessions specified.</p>
          <Link href="/" className="text-[var(--primary)] hover:opacity-80 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const sessionIds = sessionsParam.split(",").filter(Boolean);

  const storeNames = await getStoreDisplayNames();

  const tabs: {
    sessionId: string;
    entityName: string;
    session: any;
    results: any[];
  }[] = [];

  for (const id of sessionIds) {
    try {
      const [session, results] = await Promise.all([
        getReconciliationSession(id),
        getReconciliationResults(id),
      ]);

      const entities = session.entities as { name: string }[] | { name: string } | null;
      const entityName = Array.isArray(entities)
        ? entities[0]?.name ?? "Unknown"
        : entities?.name ?? "Unknown";

      tabs.push({ sessionId: id, entityName, session, results });
    } catch {
      // Skip sessions that fail to load
    }
  }

  if (tabs.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center py-20">
          <p className="text-[var(--muted-foreground)] mb-4">No valid reconciliation sessions found.</p>
          <Link href="/" className="text-[var(--primary)] hover:opacity-80 text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h2 className="text-xl font-semibold">
          {tabs.map((t) => t.entityName).join(" - ")} Reconciliation
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {tabs.length} entities reconciled
        </p>
      </div>

      <MultiSessionTabs tabs={tabs} storeNames={storeNames} />
    </div>
  );
}
