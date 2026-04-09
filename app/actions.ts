"use server";

import { supabase } from "@/lib/supabase";
import { parseRTI } from "@/lib/parsers/parseRTI";
import { getBankParser, isBankParserAvailable } from "@/lib/parsers/parseBank";
import { runReconciliation } from "@/lib/reconcile";
import type { ParsedBankRow, ParseResult } from "@/lib/types";

export async function getEntities() {
  const { data, error } = await supabase
    .from("entities")
    .select("id, name")
    .order("name");
  if (error) {
    console.error("[getEntities] Supabase error:", error);
    throw new Error(error.message);
  }
  return data;
}

export async function getRecentSessions() {
  const { data, error } = await supabase
    .from("reconciliation_sessions")
    .select(
      `id, entity_id, status, created_at, completed_at,
       matched_count, discrepancy_count, unmatched_rti_count, unmatched_bank_count,
       total_rti_deposits, total_bank_deposits,
       bank_upload_ids,
       rti_uploads(file_name, date_from, date_to),
       bank_uploads(file_name)`
    )
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[getRecentSessions] Supabase error:", error);
    throw new Error(error.message);
  }

  // For sessions with multiple bank uploads, fetch all bank file names
  if (data) {
    for (const session of data) {
      const ids: string[] = (session as Record<string, unknown>).bank_upload_ids as string[] ?? [];
      if (ids.length > 1) {
        const { data: bankUploads } = await supabase
          .from("bank_uploads")
          .select("file_name")
          .in("id", ids);
        if (bankUploads) {
          (session as Record<string, unknown>).bank_uploads = bankUploads;
        }
      }
    }
  }

  return data;
}

export async function checkEntityBankParser(entityName: string) {
  return isBankParserAvailable(entityName);
}

type UploadResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

export async function uploadAndReconcile(formData: FormData): Promise<UploadResult> {
  try {
    const entityId = formData.get("entityId") as string;
    const entityName = formData.get("entityName") as string;
    const rtiFile = formData.get("rtiFile") as File;
    const bankFileEntries = formData.getAll("bankFiles") as File[];

    if (!entityId || !rtiFile || bankFileEntries.length === 0) {
      return { success: false, error: "Missing required fields" };
    }

    // Parse RTI file
    const rtiText = await rtiFile.text();
    const rtiResult = parseRTI(rtiText);

    if (rtiResult.rows.length === 0) {
      const detail = rtiResult.errors.length > 0
        ? ` Errors: ${rtiResult.errors.slice(0, 3).join("; ")}`
        : "";
      return { success: false, error: `RTI file contains no valid rows.${detail}` };
    }

    // Check for duplicate RTI upload
    const { data: existingRti } = await supabase
      .from("rti_uploads")
      .select("id, file_name")
      .eq("entity_id", entityId)
      .eq("date_from", rtiResult.dateFrom)
      .eq("date_to", rtiResult.dateTo)
      .limit(10);

    if (existingRti && existingRti.length > 0) {
      // Check which of these uploads are actually linked to a reconciliation session
      const existingIds = existingRti.map((r: { id: string }) => r.id);
      const { data: linkedSessions } = await supabase
        .from("reconciliation_sessions")
        .select("rti_upload_id")
        .in("rti_upload_id", existingIds);

      const linkedUploadIds = new Set(
        (linkedSessions ?? []).map((s: { rti_upload_id: string }) => s.rti_upload_id)
      );
      const orphanedUploads = existingRti.filter((r: { id: string }) => !linkedUploadIds.has(r.id));
      const linkedUploads = existingRti.filter((r: { id: string }) => linkedUploadIds.has(r.id));

      // Clean up orphaned RTI uploads (from previously failed reconciliations)
      for (const orphan of orphanedUploads) {
        await supabase.from("rti_transactions").delete().eq("upload_id", orphan.id);
        await supabase.from("rti_uploads").delete().eq("id", orphan.id);
      }

      // Only block if there's still a linked (non-orphaned) upload
      if (linkedUploads.length > 0) {
        return {
          success: false,
          error: `An RTI upload already exists for ${rtiResult.dateFrom} to ${rtiResult.dateTo} (file: ${linkedUploads[0].file_name}). Delete it first or use a different date range.`,
        };
      }
    }

    // Parse all bank files
    const parser = getBankParser(entityName);
    if (!parser) {
      return { success: false, error: `No bank parser available for entity "${entityName}"` };
    }

    const bankParseResults: { file: File; result: ParseResult<ParsedBankRow> }[] = [];

    for (const bankFile of bankFileEntries) {
      const bankBuffer = Buffer.from(await bankFile.arrayBuffer());
      const bankResult = parser.parse(bankBuffer, bankFile.name);

      if (bankResult.rows.length === 0) {
        const detail = bankResult.errors.length > 0
          ? ` Errors: ${bankResult.errors.slice(0, 3).join("; ")}`
          : "";
        return { success: false, error: `Bank file "${bankFile.name}" contains no valid rows.${detail}` };
      }

      bankParseResults.push({ file: bankFile, result: bankResult });
    }

    // Insert RTI upload
    const depositRows = rtiResult.rows.filter((r) => r.is_deposit);
    const { data: rtiUpload, error: rtiUploadErr } = await supabase
      .from("rti_uploads")
      .insert({
        entity_id: entityId,
        file_name: rtiFile.name,
        date_from: rtiResult.dateFrom,
        date_to: rtiResult.dateTo,
        row_count: rtiResult.rows.length,
        deposit_row_count: depositRows.length,
      })
      .select("id")
      .single();

    if (rtiUploadErr) {
      console.error("[uploadAndReconcile] RTI upload insert failed:", rtiUploadErr);
      return { success: false, error: `Failed to save RTI upload: ${rtiUploadErr.message}` };
    }

    // Insert RTI transactions in batches
    // Note: is_deposit is a generated column (type_code = 19), do not include it
    const rtiTransactions = rtiResult.rows.map((row) => ({
      upload_id: rtiUpload.id,
      store_number: row.store_number,
      transaction_date: row.transaction_date,
      raw_label: row.raw_label,
      transaction_type: row.transaction_type,
      type_code: row.type_code,
      amount: row.amount,
    }));

    for (let i = 0; i < rtiTransactions.length; i += 500) {
      const batch = rtiTransactions.slice(i, i + 500);
      const { error } = await supabase.from("rti_transactions").insert(batch);
      if (error) {
        console.error("[uploadAndReconcile] RTI transactions insert failed:", error);
        return { success: false, error: `Failed to insert RTI transactions: ${error.message}` };
      }
    }

    // Insert each bank file as a separate bank upload and collect IDs
    const bankUploadIds: string[] = [];

    for (const { file: bankFile, result: bankResult } of bankParseResults) {
      const ext = bankFile.name.toLowerCase().split(".").pop() ?? "";
      const fileFormat = ext === "csv" ? "csv" : "xls";
      const accountNumber = bankResult.rows[0]?.account_number ?? "";

      const { data: bankUpload, error: bankUploadErr } = await supabase
        .from("bank_uploads")
        .insert({
          entity_id: entityId,
          file_name: bankFile.name,
          file_format: fileFormat,
          bank_name: "Unknown",
          account_number: accountNumber,
          date_from: bankResult.dateFrom,
          date_to: bankResult.dateTo,
          row_count: bankResult.rows.length,
        })
        .select("id")
        .single();

      if (bankUploadErr) {
        console.error("[uploadAndReconcile] Bank upload insert failed:", bankUploadErr);
        return { success: false, error: `Failed to save bank upload for "${bankFile.name}": ${bankUploadErr.message}` };
      }

      bankUploadIds.push(bankUpload.id);

      // Insert bank transactions in batches
      const bankTransactions = bankResult.rows.map((row) => ({
        upload_id: bankUpload.id,
        post_date: row.post_date,
        description: row.description,
        credit: row.credit,
        debit: row.debit,
        status: row.status,
        transaction_category: row.transaction_category,
        store_number: row.store_number,
      }));

      for (let i = 0; i < bankTransactions.length; i += 500) {
        const batch = bankTransactions.slice(i, i + 500);
        const { error } = await supabase.from("bank_transactions").insert(batch);
        if (error) {
          console.error("[uploadAndReconcile] Bank transactions insert failed:", error);
          return { success: false, error: `Failed to insert bank transactions for "${bankFile.name}": ${error.message}` };
        }
      }
    }

    // Run reconciliation against all bank uploads
    const sessionId = await runReconciliation(entityId, rtiUpload.id, bankUploadIds);

    return { success: true, sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error("[uploadAndReconcile] Unhandled error:", err);
    return { success: false, error: message };
  }
}

export async function getReconciliationSession(sessionId: string) {
  const { data, error } = await supabase
    .from("reconciliation_sessions")
    .select(
      `*,
       rti_uploads(file_name, date_from, date_to),
       bank_uploads(file_name),
       entities(name)`
    )
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(error.message);

  // For sessions with multiple bank uploads, fetch all bank file names
  const bankUploadIds: string[] = data.bank_upload_ids ?? [];
  if (bankUploadIds.length > 1) {
    const { data: bankUploads } = await supabase
      .from("bank_uploads")
      .select("file_name")
      .in("id", bankUploadIds);
    if (bankUploads) {
      data.bank_uploads = bankUploads;
    }
  }

  return data;
}

export async function getReconciliationResults(sessionId: string) {
  const { data, error } = await supabase
    .from("reconciliation_results")
    .select(
      `*,
       rti_transactions(store_number, transaction_date, transaction_type, amount, raw_label),
       bank_transactions(post_date, description, credit, debit)`
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteReconciliationSession(sessionId: string) {
  // Get session to find related upload IDs
  const { data: session, error: fetchErr } = await supabase
    .from("reconciliation_sessions")
    .select("rti_upload_id, bank_upload_id, bank_upload_ids")
    .eq("id", sessionId)
    .single();

  if (fetchErr) throw new Error(fetchErr.message);

  // Delete reconciliation results first (child records)
  const { error: resultsErr } = await supabase
    .from("reconciliation_results")
    .delete()
    .eq("session_id", sessionId);
  if (resultsErr) throw new Error(resultsErr.message);

  // Delete the session itself
  const { error: sessionErr } = await supabase
    .from("reconciliation_sessions")
    .delete()
    .eq("id", sessionId);
  if (sessionErr) throw new Error(sessionErr.message);

  // Delete related RTI transactions and upload
  if (session.rti_upload_id) {
    await supabase.from("rti_transactions").delete().eq("upload_id", session.rti_upload_id);
    await supabase.from("rti_uploads").delete().eq("id", session.rti_upload_id);
  }

  // Delete all related bank transactions and uploads
  const bankIds: string[] = session.bank_upload_ids ?? (session.bank_upload_id ? [session.bank_upload_id] : []);
  for (const bankUploadId of bankIds) {
    await supabase.from("bank_transactions").delete().eq("upload_id", bankUploadId);
    await supabase.from("bank_uploads").delete().eq("id", bankUploadId);
  }
}

export async function markResultReviewed(resultId: string, note: string) {
  const { error } = await supabase
    .from("reconciliation_results")
    .update({
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", resultId);

  if (error) throw new Error(error.message);
}
