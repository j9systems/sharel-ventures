import Papa from "papaparse";
import type { ParsedRTIRow, ParseResult } from "@/lib/types";

export function parseRTI(csvText: string): ParseResult<ParsedRTIRow> {
  const rows: ParsedRTIRow[] = [];
  const errors: string[] = [];
  let dateFrom = "";
  let dateTo = "";

  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    if (row.length < 6) {
      errors.push(`Row ${i + 1}: insufficient columns (${row.length})`);
      continue;
    }

    const label = row[1]?.trim() ?? "";
    const dateStr = row[2]?.trim() ?? "";
    const typeCodeRaw = row[3]?.trim() ?? "";
    const amount = parseFloat(row[5]?.trim() ?? "");

    if (!label || !dateStr) {
      errors.push(`Row ${i + 1}: missing label or date`);
      continue;
    }

    if (isNaN(amount)) {
      errors.push(`Row ${i + 1}: invalid amount "${row[5]}"`);
      continue;
    }

    // Parse store number from label: digits after "Store #"
    const storeMatch = label.match(/Store\s*#(\d+)/i);
    if (!storeMatch) {
      errors.push(`Row ${i + 1}: could not parse store number from "${label}"`);
      continue;
    }
    const storeNumber = storeMatch[1];

    // Parse transaction type: text after "Store #XXXX "
    const afterStore = label.replace(/^Store\s*#\d+\s*/i, "");
    const transactionType = afterStore
      .replace(/\s*-\s*Amt\.?\s*$/i, "") // strip " - Amt." suffix
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");

    const typeCode = parseInt(typeCodeRaw, 10);
    const isDeposit = typeCode === 19;

    // Parse date M/D/YYYY → YYYY-MM-DD
    const transactionDate = parseDate(dateStr);
    if (!transactionDate) {
      errors.push(`Row ${i + 1}: invalid date "${dateStr}"`);
      continue;
    }

    // Track date range
    if (!dateFrom || transactionDate < dateFrom) dateFrom = transactionDate;
    if (!dateTo || transactionDate > dateTo) dateTo = transactionDate;

    rows.push({
      store_number: storeNumber,
      transaction_date: transactionDate,
      raw_label: label,
      transaction_type: transactionType,
      type_code: typeCode,
      is_deposit: isDeposit,
      amount,
    });
  }

  return { rows, dateFrom, dateTo, errors };
}

function parseDate(dateStr: string): string | null {
  // Expected format: M/D/YYYY
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
