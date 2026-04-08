"use server";

import { supabase } from "@/lib/supabase";
import { parseRTI } from "@/lib/parsers/parseRTI";
import { getBankParser, isBankParserAvailable } from "@/lib/parsers/parseBank";
import { runReconciliation } from "@/lib/reconcile";

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
       rti_uploads(file_name, date_from, date_to),
       bank_uploads(file_name)`
    )
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    console.error("[getRecentSessions] Supabase error:", error);
    throw new Error(error.message);
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
    const bankFile = formData.get("bankFile") as File;

    if (!entityId || !rtiFile || !bankFile) {
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
      .limit(1);

    if (existingRti && existingRti.length > 0) {
      return {
        success: false,
        error: `An RTI upload already exists for ${rtiResult.dateFrom} to ${rtiResult.dateTo} (file: ${existingRti[0].file_name}). Delete it first or use a different date range.`,
      };
    }

    // Parse bank file
    const parser = getBankParser(entityName);
    if (!parser) {
      return { success: false, error: `No bank parser available for entity "${entityName}"` };
    }

    const bankBuffer = Buffer.from(await bankFile.arrayBuffer());
    const bankResult = parser.parse(bankBuffer, bankFile.name);

    if (bankResult.rows.length === 0) {
      const detail = bankResult.errors.length > 0
        ? ` Errors: ${bankResult.errors.slice(0, 3).join("; ")}`
        : "";
      return { success: false, error: `Bank file contains no valid rows.${detail}` };
    }

    // Check for duplicate bank upload
    const { data: existingBank } = await supabase
      .from("bank_uploads")
      .select("id, file_name")
      .eq("entity_id", entityId)
      .eq("date_from", bankResult.dateFrom)
      .eq("date_to", bankResult.dateTo)
      .limit(1);

    if (existingBank && existingBank.length > 0) {
      return {
        success: false,
        error: `A bank upload already exists for ${bankResult.dateFrom} to ${bankResult.dateTo} (file: ${existingBank[0].file_name}). Delete it first or use a different date range.`,
      };
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
    const rtiTransactions = rtiResult.rows.map((row) => ({
      upload_id: rtiUpload.id,
      store_number: row.store_number,
      transaction_date: row.transaction_date,
      raw_label: row.raw_label,
      transaction_type: row.transaction_type,
      type_code: row.type_code,
      is_deposit: row.is_deposit,
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

    // Determine bank file format
    const ext = bankFile.name.toLowerCase().split(".").pop() ?? "";
    const fileFormat = ext === "csv" ? "csv" : "xls";

    // Extract account number from first row
    const accountNumber = bankResult.rows[0]?.account_number ?? "";

    // Insert bank upload
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
      return { success: false, error: `Failed to save bank upload: ${bankUploadErr.message}` };
    }

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
        return { success: false, error: `Failed to insert bank transactions: ${error.message}` };
      }
    }

    // Run reconciliation
    const sessionId = await runReconciliation(entityId, rtiUpload.id, bankUpload.id);

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
