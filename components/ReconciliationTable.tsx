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
    bank_uploads: {
      account_number: string;
    } | null;
  } | null;
}

interface ReconciliationTableProps {
  results: ResultRow[];
  storeNames: Record<string, string>;
}

type SortField =
  | "store"
  | "rti_date"
  | "bank_date"
  | "rti_amount"
  | "bank_amount"
  | "delta"
  | "status";
type SortDir = "asc" | "desc";

const BANK_ACCOUNT_COLORS = [
  "#c0392b", // red
  "#27ae60", // green
  "#2980b9", // blue
  "#d35400", // burnt orange
  "#8e44ad", // purple
  "#16a085", // teal
  "#c2185b", // deep pink
  "#7b8a2d", // olive
  "#0277bd", // dark sky
  "#6d4c41", // brown
  "#ad1457", // raspberry
  "#00838f", // dark cyan
];

function getBankAccountColor(accountNumber: string): string {
  let hash = 0;
  for (let i = 0; i < accountNumber.length; i++) {
    hash = (hash * 31 + accountNumber.charCodeAt(i)) | 0;
  }
  return BANK_ACCOUNT_COLORS[Math.abs(hash) % BANK_ACCOUNT_COLORS.length];
}

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

export function ReconciliationTable({ results, storeNames }: ReconciliationTableProps) {
  const [sortField, setSortField] = useState<SortField>("status");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all">("all");
  const [storeFilter, setStoreFilter] = useState("");
  const [amountSearch, setAmountSearch] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [localResults, setLocalResults] = useState(results);
  const [submitting, setSubmitting] = useState(false);

  function getStoreName(storeNumber: string | undefined | null): string {
    if (!storeNumber) return "Unknown";
    return storeNames[storeNumber] ?? `Store #${storeNumber}`;
  }

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
      if (amountSearch.trim()) {
        const q = amountSearch.trim().replace(/[$,]/g, "").toLowerCase();
        const rtiStr = r.rti_amount?.toFixed(2) ?? "";
        const bankStr = r.bank_amount?.toFixed(2) ?? "";
        const storeNum = r.rti_transactions?.store_number ?? "";
        const storeName = getStoreName(storeNum).toLowerCase();
        const amountMatch = rtiStr.includes(q) || bankStr.includes(q);
        const storeMatch = storeNum.includes(q) || storeName.includes(q);
        if (!amountMatch && !storeMatch) return false;
      }
      return true;
    });
  }, [localResults, statusFilter, storeFilter, amountSearch]);

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
        case "rti_date": {
          const da = a.rti_transactions?.transaction_date ?? "";
          const db = b.rti_transactions?.transaction_date ?? "";
          cmp = da.localeCompare(db);
          break;
        }
        case "bank_date": {
          const da = a.bank_transactions?.post_date ?? "";
          const db = b.bank_transactions?.post_date ?? "";
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
      "RTI Date",
      "Bank Date",
      "Bank Description",
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
        r.rti_transactions?.transaction_date ?? "",
        r.bank_transactions?.post_date ?? "",
        r.bank_transactions?.description ?? "",
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
      className="flex items-center gap-1 hover:text-[var(--foreground)] transition-colors cursor-pointer"
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
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
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
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] cursor-pointer"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s} value={s}>
              {getStoreName(s)} (#{s})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search amount, store…"
          value={amountSearch}
          onChange={(e) => setAmountSearch(e.target.value)}
          className="bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm
                     text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]
                     w-44 placeholder:text-[var(--muted-foreground)]"
        />

        <div className="flex-1" />

        <span className="text-xs text-[var(--muted-foreground)]">
          {sorted.length} of {localResults.length} results
        </span>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors cursor-pointer"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--card)] text-[var(--muted-foreground)] text-left">
                <th className="px-4 py-3 font-medium">
                  <SortButton field="store">Store</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortButton field="rti_date">RTI Date</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortButton field="bank_date">Bank Date</SortButton>
                </th>
                <th className="px-4 py-3 font-medium">Bank Desc</th>
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
            <tbody className="divide-y divide-[var(--border)]">
              {sorted.map((row) => {
                const store =
                  row.rti_transactions?.store_number ?? "Unknown";
                const rtiDate = row.rti_transactions?.transaction_date ?? "—";
                const bankDate = row.bank_transactions?.post_date ?? "—";
                const depositType =
                  row.rti_transactions?.transaction_type
                    ?.replace(/_/g, " ")
                    .replace(/^DEPOSIT\s*/i, "Deposit ") ?? "—";

                return (
                  <tr
                    key={row.id}
                    className="bg-[var(--background)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-[var(--foreground)]">{getStoreName(store)}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">#{store}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {rtiDate}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">
                      {bankDate}
                    </td>
                    <td className="px-4 py-3">
                      {row.bank_transactions?.description && (
                        <div
                          className="text-xs truncate max-w-[200px]"
                          title={row.bank_transactions.description}
                          style={{
                            color: row.bank_transactions.bank_uploads?.account_number
                              ? getBankAccountColor(row.bank_transactions.bank_uploads.account_number)
                              : "var(--muted-foreground)",
                          }}
                        >
                          {row.bank_transactions.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">{depositType}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        row.rti_amount === null ? "text-[var(--muted-foreground)]" : ""
                      }`}
                    >
                      {formatCurrency(row.rti_amount)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        row.bank_amount === null ? "text-[var(--muted-foreground)]" : ""
                      }`}
                    >
                      {formatCurrency(row.bank_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {row.match_status === "discrepancy" ? (
                        <span style={{ color: "var(--status-discrepancy-text)" }}>
                          {formatDelta(row.delta)}
                        </span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
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
                                className="bg-[var(--card)] border border-[var(--border)] rounded px-2 py-1 text-xs w-32 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleReview(row.id);
                                }}
                              />
                              <button
                                onClick={() => handleReview(row.id)}
                                disabled={submitting}
                                className="p-1 rounded transition-colors cursor-pointer"
                                style={{ color: "var(--status-confirm-text)" }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--status-confirm-hover-bg)"}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setReviewingId(null);
                                  setReviewNote("");
                                }}
                                className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewingId(row.id)}
                              className="text-xs text-[var(--primary)] hover:opacity-80 transition-colors cursor-pointer"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </>
                      )}
                      {row.reviewed && (
                        <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
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
                    colSpan={10}
                    className="px-4 py-12 text-center text-[var(--muted-foreground)]"
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
