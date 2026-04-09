import { supabase } from "@/lib/supabase";

export interface EntityMatch {
  entityId: string;
  entityName: string;
}

/**
 * Detect entity from parsed RTI rows.
 * Looks up store_number values against the stores table.
 * Throws if no store numbers are recognized, or if rows span two entities.
 */
export async function detectEntityFromRTIRows(
  rows: { store_number: string | null }[]
): Promise<EntityMatch> {
  const storeNumbers = [
    ...new Set(rows.map((r) => r.store_number?.trim()).filter(Boolean)),
  ] as string[];

  if (storeNumbers.length === 0) {
    throw new Error(
      "Could not detect entity — no store numbers found in RTI file."
    );
  }

  const { data, error } = await supabase
    .from("stores")
    .select("store_number, entity_id, entities(id, name)")
    .in("store_number", storeNumbers);

  if (error) throw new Error(`Store lookup failed: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      `No matching stores found for store numbers: ${storeNumbers.join(", ")}`
    );
  }

  const entityIds = [...new Set(data.map((r: any) => r.entity_id))];
  if (entityIds.length > 1) {
    const names = [...new Set(data.map((r: any) => r.entities?.name))].join(", ");
    throw new Error(
      `RTI file contains stores from multiple entities (${names}). Upload separate files per entity.`
    );
  }

  const first = data[0] as any;
  return { entityId: first.entity_id, entityName: first.entities.name };
}

/**
 * Detect entity from parsed bank file rows.
 * Primary: match last 4 digits of account_number against bank_accounts table.
 * Fallback: extract store numbers from Sharel CNB descriptions, look up in stores table.
 * Returns null if entity cannot be determined.
 */
export async function detectEntityFromBankRows(
  rows: { account_number?: string | null; description?: string | null }[]
): Promise<EntityMatch | null> {
  // Primary: account number suffix
  const suffixes = [
    ...new Set(
      rows
        .map((r) => r.account_number?.replace(/[^0-9]/g, "").slice(-4))
        .filter(Boolean)
    ),
  ] as string[];

  if (suffixes.length > 0) {
    const { data } = await supabase
      .from("bank_accounts")
      .select("account_suffix, entity_id, entities(id, name)")
      .in("account_suffix", suffixes)
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as any;
      return { entityId: row.entity_id, entityName: row.entities.name };
    }
  }

  // Fallback: store numbers in descriptions (Sharel CNB format)
  const descStoreNumbers = [
    ...new Set(
      rows
        .map((r) => r.description?.match(/-\s+(?:store\s*)?#?\s*(\d{3,6})/i)?.[1])
        .filter(Boolean)
    ),
  ] as string[];

  if (descStoreNumbers.length > 0) {
    const { data } = await supabase
      .from("stores")
      .select("store_number, entity_id, entities(id, name)")
      .in("store_number", descStoreNumbers)
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0] as any;
      return { entityId: row.entity_id, entityName: row.entities.name };
    }
  }

  return null;
}

/**
 * Fetch a store_number → display_name map for the results table UI.
 * Called server-side and passed as a prop to ReconciliationTable.
 */
export async function getStoreDisplayNames(): Promise<Record<string, string>> {
  const { data } = await supabase.from("stores").select("store_number, display_name");
  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.store_number] = row.display_name;
  }
  return map;
}
