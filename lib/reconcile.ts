import { supabase } from "./supabase";

interface RTIDeposit {
  id: string;
  transaction_date: string;
  amount: number;
}

interface BankDeposit {
  id: string;
  post_date: string;
  credit: number | null;
}

interface ResultInsert {
  session_id: string;
  rti_transaction_id: string | null;
  bank_transaction_id: string | null;
  match_status: string;
  rti_amount: number | null;
  bank_amount: number | null;
  delta: number | null;
  reviewed: boolean;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runReconciliation(
  entityId: string,
  rtiUploadId: string,
  bankUploadIds: string[]
): Promise<string> {
  // Step 1: Pull RTI deposits
  const { data: rtiRows, error: rtiErr } = await supabase
    .from("rti_transactions")
    .select("id, transaction_date, amount")
    .eq("upload_id", rtiUploadId)
    .eq("is_deposit", true)
    .order("transaction_date", { ascending: true });

  if (rtiErr) {
    console.error("[runReconciliation] Failed to fetch RTI deposits:", rtiErr);
    throw new Error(`Failed to fetch RTI deposits: ${rtiErr.message}`);
  }

  // Step 2: Pull bank physical deposits from all bank uploads
  const allBankRows: BankDeposit[] = [];
  for (const bankUploadId of bankUploadIds) {
    const { data: bankRows, error: bankErr } = await supabase
      .from("bank_transactions")
      .select("id, post_date, credit")
      .eq("upload_id", bankUploadId)
      .eq("transaction_category", "physical_deposit")
      .order("post_date", { ascending: true });

    if (bankErr) {
      console.error("[runReconciliation] Failed to fetch bank deposits:", bankErr);
      throw new Error(`Failed to fetch bank deposits: ${bankErr.message}`);
    }

    if (bankRows) {
      allBankRows.push(...bankRows);
    }
  }

  // Sort combined bank deposits by post_date
  allBankRows.sort((a, b) => a.post_date.localeCompare(b.post_date));

  // Step 3: Create reconciliation session
  // bank_upload_id stores the first upload for FK compatibility,
  // bank_upload_ids stores all upload IDs
  const { data: session, error: sessionErr } = await supabase
    .from("reconciliation_sessions")
    .insert({
      entity_id: entityId,
      rti_upload_id: rtiUploadId,
      bank_upload_id: bankUploadIds[0],
      bank_upload_ids: bankUploadIds,
      status: "processing",
      total_rti_deposits: rtiRows?.length ?? 0,
      total_bank_deposits: allBankRows.length,
      matched_count: 0,
      discrepancy_count: 0,
      unmatched_rti_count: 0,
      unmatched_bank_count: 0,
    })
    .select("id")
    .single();

  if (sessionErr) {
    console.error("[runReconciliation] Failed to create session:", sessionErr);
    throw new Error(`Failed to create session: ${sessionErr.message}`);
  }
  const sessionId = session.id;

  // Step 4: Match
  const rtiDeposits: RTIDeposit[] = rtiRows ?? [];
  const bankPool: BankDeposit[] = [...allBankRows];
  const results: ResultInsert[] = [];

  let matchedCount = 0;
  let discrepancyCount = 0;
  let unmatchedRtiCount = 0;

  for (const rti of rtiDeposits) {
    const rtiAmount = rti.amount;
    const rtiDate = rti.transaction_date;
    let matched = false;

    // a) Exact amount + exact date
    const exactIdx = bankPool.findIndex(
      (b) => b.post_date === rtiDate && b.credit !== null && Math.abs(b.credit - rtiAmount) < 0.005
    );

    if (exactIdx !== -1) {
      const bank = bankPool.splice(exactIdx, 1)[0];
      results.push({
        session_id: sessionId,
        rti_transaction_id: rti.id,
        bank_transaction_id: bank.id,
        match_status: "matched",
        rti_amount: rtiAmount,
        bank_amount: bank.credit,
        delta: null,
        reviewed: false,
      });
      matchedCount++;
      matched = true;
      continue;
    }

    // b) Same date, amount within $5.00
    const closeIdx = bankPool.findIndex(
      (b) =>
        b.post_date === rtiDate &&
        b.credit !== null &&
        Math.abs(b.credit - rtiAmount) <= 5.0
    );

    if (closeIdx !== -1) {
      const bank = bankPool.splice(closeIdx, 1)[0];
      const delta = (bank.credit ?? 0) - rtiAmount;
      results.push({
        session_id: sessionId,
        rti_transaction_id: rti.id,
        bank_transaction_id: bank.id,
        match_status: "discrepancy",
        rti_amount: rtiAmount,
        bank_amount: bank.credit,
        delta,
        reviewed: false,
      });
      discrepancyCount++;
      matched = true;
      continue;
    }

    // c) Exact amount within a date window (bank posts typically lag RTI by 1-7 days)
    const windowStart = addDays(rtiDate, -1);
    const windowEnd = addDays(rtiDate, 7);
    const nearIdx = bankPool.findIndex(
      (b) =>
        b.post_date >= windowStart &&
        b.post_date <= windowEnd &&
        b.post_date !== rtiDate && // already checked exact date above
        b.credit !== null &&
        Math.abs(b.credit - rtiAmount) < 0.005
    );

    if (nearIdx !== -1) {
      const bank = bankPool.splice(nearIdx, 1)[0];
      results.push({
        session_id: sessionId,
        rti_transaction_id: rti.id,
        bank_transaction_id: bank.id,
        match_status: "matched",
        rti_amount: rtiAmount,
        bank_amount: bank.credit,
        delta: null,
        reviewed: false,
      });
      matchedCount++;
      matched = true;
      continue;
    }

    // d) Close amount (within $5) within date window
    const closeWindowIdx = bankPool.findIndex(
      (b) =>
        b.post_date >= windowStart &&
        b.post_date <= windowEnd &&
        b.post_date !== rtiDate &&
        b.credit !== null &&
        Math.abs(b.credit - rtiAmount) <= 5.0
    );

    if (closeWindowIdx !== -1) {
      const bank = bankPool.splice(closeWindowIdx, 1)[0];
      const delta = (bank.credit ?? 0) - rtiAmount;
      results.push({
        session_id: sessionId,
        rti_transaction_id: rti.id,
        bank_transaction_id: bank.id,
        match_status: "discrepancy",
        rti_amount: rtiAmount,
        bank_amount: bank.credit,
        delta,
        reviewed: false,
      });
      discrepancyCount++;
      matched = true;
      continue;
    }

    // e) No match — rti_only
    if (!matched) {
      results.push({
        session_id: sessionId,
        rti_transaction_id: rti.id,
        bank_transaction_id: null,
        match_status: "rti_only",
        rti_amount: rtiAmount,
        bank_amount: null,
        delta: null,
        reviewed: false,
      });
      unmatchedRtiCount++;
    }
  }

  // Remaining bank rows → bank_only
  for (const bank of bankPool) {
    results.push({
      session_id: sessionId,
      rti_transaction_id: null,
      bank_transaction_id: bank.id,
      match_status: "bank_only",
      rti_amount: null,
      bank_amount: bank.credit,
      delta: null,
      reviewed: false,
    });
  }
  const unmatchedBankCount = bankPool.length;

  // Insert results in batches of 500
  for (let i = 0; i < results.length; i += 500) {
    const batch = results.slice(i, i + 500);
    const { error: insertErr } = await supabase
      .from("reconciliation_results")
      .insert(batch);
    if (insertErr) {
      console.error("[runReconciliation] Failed to insert results:", insertErr);
      throw new Error(`Failed to insert results: ${insertErr.message}`);
    }
  }

  // Step 5: Update session with summary
  const { error: updateErr } = await supabase
    .from("reconciliation_sessions")
    .update({
      status: "complete",
      completed_at: new Date().toISOString(),
      matched_count: matchedCount,
      discrepancy_count: discrepancyCount,
      unmatched_rti_count: unmatchedRtiCount,
      unmatched_bank_count: unmatchedBankCount,
    })
    .eq("id", sessionId);

  if (updateErr) {
    console.error("[runReconciliation] Failed to update session:", updateErr);
    throw new Error(`Failed to update session: ${updateErr.message}`);
  }

  return sessionId;
}
