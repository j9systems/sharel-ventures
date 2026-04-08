"use client";

import { useState, useMemo, useCallback } from "react";
import { StatusBadge } from "./StatusBadge";
import { markResultReviewed } from "@/app/actions";
import type { MatchStatus } from "@/lib/types";
import { ArrowUpDown, Download, Check, X } from "lucide-react";

interface ResultRow {
  id: string;
  match_status: MatchStatus;
  rti_amount: number | null;
  bank_amount: number | null;
  delta: number | null;
  reviewed: boolean;
  review_note: string | null;
  rti_transactions: {
    store_number: string;
    transaction_date: string;
    transaction_type: string;
    amount: number;
    raw_label: string;
  } | null;
  bank_transactions: {
    post_date: string;
    description: string;
    credit: number | null;
    debit: number | null;
  } | null;
}

interface ReconciliationTableProps {
  results: ResultRow[];
}

type SortField =
  | "store"
  | "date"
  | "rti_amount"
  | "bank_amount"
  | "delta"
  | "status";
type SortDir = "asc" | "desc";

const statusOrder: Record<MatchStatus, number> = {
  discrepancy: 0,
  rti_only: 1,
  bank_only: 2,
  matched: 3,
};

function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(val);
}

function formatDelta(val: number | null): string {
  if (val === null || val === undefined) return "—";
  const sign = val >= 0 ? "+" : "";
  return `${sign}${formatCurrency(val).replace("$", "$")}`;
}

export function ReconciliationTable({ results }: ReconciliationTableProps) {
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [storeFilter, setStoreFilter] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [localResults, setLocalResults] = useState(results);
  const [submitting, setSubmitting] = useState(false);

  // Unique stores for filter
  const stores = useMemo(() => {
    const set = new Set<string>();
    localResults.forEach((r) => {
      const store = r.rti_transactions?.store_number;
      if (store) set.add(store);
    });
    return Array.from(set).sort();
  }, [localResults]);

  // Filter
  const filtered = useMemo(() => {
    return localResults.filter((r) => {
      if (statusFilter !== "all" && r.match_status !== statusFilter) return false;
      if (storeFilter) {
        const store = r.rti_transactions?.store_number ?? "";
        if (store !== storeFilter) return false;
      }
      return true;
    });
  }, [localResults, statusFilter, storeFilter]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "store": {
          const sa = a.rti_transactions?.store_number ?? "";
          const sb = b.rti_transactions?.store_number ?? "";
          cmp = sa.localeCompare(sb);
          break;
        }
        case "date": {
          const da =
            a.rti_transactions?.transaction_date ??
            a.bank_transactions?.post_date ??
            "";
          const db =
            b.rti_transactions?.transaction_date ??
            b.bank_transactions?.post_date ??
            "";
          cmp = da.localeCompare(db);
          break;
        }
        case "rti_amount":
          cmp = (a.rti_amount ?? 0) - (b.rti_amount ?? 0);
          break;
        case "bank_amount":
          cmp = (a.bank_amount ?? 0) - (b.bank_amount ?? 0);
          break;
        case "delta":
          cmp = (a.delta ?? 0) - (b.delta ?? 0);
          break;
        case "status": {
          // Unreviewed items first within each status group
          const reviewedA = a.reviewed ? 1 : 0;
          const reviewedB = b.reviewed ? 1 : 0;
          cmp = statusOrder[a.match_status] - statusOrder[b.match_status];
          if (cmp === 0) cmp = reviewedA - reviewedB;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortField, sortDir]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const handleReview = async (id: string) => {
    setSubmitting(true);
    try {
      await markResultReviewed(id, reviewNote);
      setLocalResults((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, reviewed: true, review_note: reviewNote } : r
        )
      );
      setReviewingId(null);
      setReviewNote("");
    } catch (err) {
      console.error("Failed to mark as reviewed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const exportCSV = useCallback(() => {
    const headers = [
      "Store",
      "Date",
      "Deposit Type",
      "RTI Amount",
      "Bank Amount",
      "Delta",
      "Status",
      "Reviewed",
      "Review Note",
    ];
    const csvRows = [headers.join(",")];
    for (const r of sorted) {
      const row = [
        r.rti_transactions?.store_number ?? "Unknown",
        r.rti_transactions?.transaction_date ??
          r.bank_transactions?.post_date ??
          "",
        r.rti_transactions?.transaction_type ?? "",
        r.rti_amount?.toFixed(2) ?? "",
        r.bank_amount?.toFixed(2) ?? "",
        r.delta?.toFixed(2) ?? "",
        r.match_status,
        r.reviewed ? "Yes" : "No",
        r.review_note ?? "",
      ];
      csvRows.push(row.map((v) => `"${v}"`).join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as MatchStatus | "all")}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
        >
          <option value="all">All Statuses</option>
          <option value="matched">Matched</option>
          <option value="discrepancy">Discrepancy</option>
          <option value="rti_only">Missing in Bank</option>
          <option value="bank_only">Bank Only</option>
        </select>

        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#f5f5f5] focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s} value={s}>
              Store #{s}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        <span className="text-xs text-[#a3a3a3]">
          {sorted.length} of {localResults.length} results
        </span>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#a3a3a3] hover:text-white hover:border-[#404040] transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1a1a1a] text-[#a3a3a3] text-left">
                <th className="px-4 py-3 font-medium">
                  <SortButton field="store">Store</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortButton field="date">Date</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">Deposit #</th>
                <th className="px-4 py-3 font-medium text-right">
                  <SortButton field="rti_amount">RTI Amount</SortButton>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <SortButton field="bank_amount">Bank Amount</SortButton>
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  <SortButton field="delta">Delta</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortButton field="status">Status</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {sorted.map((row) => {
                const store =
                  row.rti_transactions?.store_number ?? "Unknown";
                const date =
                  row.rti_transactions?.transaction_date ??
                  row.bank_transactions?.post_date ??
                  "—";
                const depositType =
                  row.rti_transactions?.transaction_type
                    ?.replace(/_/g, " ")
                    .replace(/^DEPOSIT\s*/i, "Deposit ") ?? "—";

                return (
                  <tr
                    key={row.id}
                    className="bg-[#0f0f0f] hover:bg-[#161616] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {store !== "Unknown" ? `#${store}` : store}
                    </td>
                    <td className="px-4 py-3 text-[#a3a3a3]">{date}</td>
                    <td className="px-4 py-3">{depositType}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        row.rti_amount === null ? "text-[#404040]" : ""
                      }`}
                    >
                      {formatCurrency(row.rti_amount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        row.bank_amount === null ? "text-[#404040]" : ""
                      }`}
                    >
                      {formatCurrency(row.bank_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.match_status === "discrepancy" ? (
                        <span className="text-yellow-400">
                          {formatDelta(row.delta)}
                        </span>
                      ) : (
                        <span className="text-[#404040]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.match_status} />
                    </td>
                    <td className="px-4 py-3">
                      {row.match_status !== "matched" && !row.reviewed && (
                        <>
                          {reviewingId === row.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Note..."
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[#7c3aed]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleReview(row.id);
                                }}
                              />
                              <button
                                onClick={() => handleReview(row.id)}
                                disabled={submitting}
                                className="p-1 rounded hover:bg-green-500/20 text-green-400 transition-colors"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingId(null);
                                  setReviewNote("");
                                }}
                                className="p-1 rounded hover:bg-[#2a2a2a] text-[#a3a3a3] transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewingId(row.id)}
                              className="text-xs text-[#7c3aed] hover:text-[#9b6aed] transition-colors"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </>
                      )}
                      {row.reviewed && (
                        <span className="flex items-center gap-1 text-xs text-[#666]">
                          <Check className="h-3 w-3" />
                          Resolved
                          {row.review_note && (
                            <span
                              className="ml-1 truncate max-w-[100px]"
                              title={row.review_note}
                            >
                              — {row.review_note}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-[#a3a3a3]"
                  >
                    No results match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
