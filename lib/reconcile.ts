import { supabase } from "./supabase";

interface RTIDeposit {
  id: string;
  transaction_date: string;
  amount: number;
  store_number: string | null;
}

interface BankDeposit {
  id: string;
  post_date: string;
  credit: number | null;
  store_number: string | null;
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
    .select("id, transaction_date, amount, store_number")
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
      .select("id, post_date, credit, store_number")
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

  // Score-based matching: evaluate ALL RTI-bank candidate pairs globally,
  // then assign from highest score to lowest. This prevents a lower-scoring
  // pair from consuming a bank record that a higher-scoring pair needs.
  function scoreCandidate(rti: RTIDeposit, bank: BankDeposit): number {
    if (bank.credit === null) return -1;

    const rtiDate = rti.transaction_date;
    const amountDiff = Math.abs(bank.credit - rti.amount);
    const windowStart = addDays(rtiDate, -1);
    const windowEnd = addDays(rtiDate, 7);

    // Must be within date window
    if (bank.post_date < windowStart || bank.post_date > windowEnd) return -1;
    // Must be within $5 tolerance
    if (amountDiff > 5.0) return -1;

    let score = 0;

    // Store number match is the strongest signal (+1000)
    if (rti.store_number && bank.store_number) {
      if (rti.store_number === bank.store_number) {
        score += 1000;
      } else {
        return -1;
      }
    }

    // Exact amount match (+500)
    if (amountDiff < 0.005) {
      score += 2000;
    } else {
      // Closer amounts score higher (0-499 range)
      score += Math.max(0, Math.round(499 * (1 - amountDiff / 5.0)));
    }

    // Exact date match (+100), otherwise closer dates score higher
    if (bank.post_date === rtiDate) {
      score += 100;
    } else {
      const daysDiff = Math.abs(
        (new Date(bank.post_date).getTime() - new Date(rtiDate).getTime()) /
          86400000
      );
      score += Math.max(0, Math.round(99 * (1 - daysDiff / 8)));
    }

    return score;
  }

  // Build all candidate pairs and score them
  const candidatePairs: { rtiIdx: number; bankIdx: number; score: number }[] = [];
  for (let r = 0; r < rtiDeposits.length; r++) {
    for (let b = 0; b < bankPool.length; b++) {
      const score = scoreCandidate(rtiDeposits[r], bankPool[b]);
      if (score >= 0) {
        candidatePairs.push({ rtiIdx: r, bankIdx: b, score });
      }
    }
  }

  // Sort by score descending — highest-quality matches assigned first
  candidatePairs.sort((a, b) => b.score - a.score);

  // Greedily assign: highest score wins, skip already-assigned records
  const assignedRti = new Set<number>();
  const assignedBank = new Set<number>();

  for (const pair of candidatePairs) {
    if (assignedRti.has(pair.rtiIdx) || assignedBank.has(pair.bankIdx)) continue;

    assignedRti.add(pair.rtiIdx);
    assignedBank.add(pair.bankIdx);

    const rti = rtiDeposits[pair.rtiIdx];
    const bank = bankPool[pair.bankIdx];
    const rtiAmount = rti.amount;
    const amountDiff = Math.abs((bank.credit ?? 0) - rtiAmount);
    const isExact = amountDiff < 0.005;

    if (isExact) {
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
    } else {
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
    }
  }

  // Unmatched RTI records → rti_only
  for (let r = 0; r < rtiDeposits.length; r++) {
    if (assignedRti.has(r)) continue;
    const rti = rtiDeposits[r];
    results.push({
      session_id: sessionId,
      rti_transaction_id: rti.id,
      bank_transaction_id: null,
      match_status: "rti_only",
      rti_amount: rti.amount,
      bank_amount: null,
      delta: null,
      reviewed: false,
    });
    unmatchedRtiCount++;
  }

  // Unmatched bank rows → bank_only
  for (let b = 0; b < bankPool.length; b++) {
    if (assignedBank.has(b)) continue;
    const bank = bankPool[b];
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
  const unmatchedBankCount = bankPool.length - assignedBank.size;

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
