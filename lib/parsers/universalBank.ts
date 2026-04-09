import * as XLSX from "xlsx";
import type { BankParser, ParsedBankRow, ParseResult } from "@/lib/types";

function categorizeDescription(description: string): string {
  const lower = description.toLowerCase();

  if (lower.startsWith("electronic deposit")) return "card_settlement";
  if (lower.startsWith("sweep deposit") || lower.startsWith("sweep withdrawal")) return "sweep";
  if (lower === "deposit") return "physical_deposit";
  if (lower.startsWith("descriptive deposit")) return "physical_deposit";
  if (lower.startsWith("deposit -")) return "physical_deposit";
  if (lower.startsWith("electronic withdrawal")) return "withdrawal";
  if (lower.startsWith("check")) return "check";
  return "other";
}

function extractStoreNumber(description: string, category: string): string | null {
  if (category !== "physical_deposit") return null;
  const match = description.match(/-\s+(?:store\s*)?#?\s*(\d{3,6})/i);
  return match ? match[1] : null;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseExcelDate(serial: number): string {
  const parsed = XLSX.SSF.parse_date_code(serial);
  return formatDate(parsed.y, parsed.m, parsed.d);
}

function parseDateString(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function parseXLS(buffer: Buffer): ParseResult<ParsedBankRow> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: "",
  });

  return processRows(rawData, true);
}

function parseCSV(csvText: string): ParseResult<ParsedBankRow> {
  const workbook = XLSX.read(csvText, { type: "string" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: "",
  });

  return processRows(rawData, false);
}

function processRows(
  rawData: Record<string, unknown>[],
  isExcel: boolean
): ParseResult<ParsedBankRow> {
  const rows: ParsedBankRow[] = [];
  const errors: string[] = [];
  let dateFrom = "";
  let dateTo = "";

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i];

    const accountNumber = String(row["Account Number"] ?? "").trim();
    const postDateRaw = row["Post Date"];
    const check = String(row["Check"] ?? "").trim();
    const description = String(row["Description"] ?? "").trim();
    const debitRaw = row["Debit"];
    const creditRaw = row["Credit"];
    const status = String(row["Status"] ?? "").trim();

    if (!description && !accountNumber) continue;

    // Parse post date
    let postDate: string | null = null;
    if (isExcel && typeof postDateRaw === "number") {
      postDate = parseExcelDate(postDateRaw);
    } else if (typeof postDateRaw === "string" && postDateRaw.trim()) {
      postDate = parseDateString(postDateRaw.trim());
    }

    if (!postDate) {
      errors.push(`Row ${i + 2}: invalid post date "${postDateRaw}"`);
      continue;
    }

    // Parse amounts
    const credit =
      creditRaw !== "" && creditRaw != null
        ? parseFloat(String(creditRaw))
        : null;
    const debit =
      debitRaw !== "" && debitRaw != null
        ? parseFloat(String(debitRaw))
        : null;

    const category = categorizeDescription(description);
    const storeNumber = extractStoreNumber(description, category);

    // Track date range
    if (!dateFrom || postDate < dateFrom) dateFrom = postDate;
    if (!dateTo || postDate > dateTo) dateTo = postDate;

    rows.push({
      account_number: accountNumber,
      post_date: postDate,
      check,
      description,
      debit: debit !== null && !isNaN(debit) ? debit : null,
      credit: credit !== null && !isNaN(credit) ? credit : null,
      status,
      transaction_category: category,
      store_number: storeNumber,
    });
  }

  return { rows, dateFrom, dateTo, errors };
}

export const universalBankParser: BankParser = {
  parse(fileBuffer: Buffer, fileName: string): ParseResult<ParsedBankRow> {
    const ext = fileName.toLowerCase().split(".").pop();

    if (ext === "csv") {
      const text = fileBuffer.toString("utf-8");
      return parseCSV(text);
    }

    // XLS or XLSX
    return parseXLS(fileBuffer);
  },
};
