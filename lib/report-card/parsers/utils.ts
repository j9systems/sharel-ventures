import type { WorkBook, WorkSheet } from "xlsx";
import * as XLSX from "xlsx";

export function getSheet(wb: WorkBook, nameContains: string): WorkSheet | null {
  const sheetName = wb.SheetNames.find((n) =>
    n.toLowerCase().includes(nameContains.toLowerCase())
  );
  return sheetName ? wb.Sheets[sheetName] : null;
}

export function getSheetByExactName(wb: WorkBook, name: string): WorkSheet | null {
  return wb.Sheets[name] ?? null;
}

export function sheetToRows(sheet: WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: true,
  }) as unknown[][];
}

export function findStoreRow(
  rows: unknown[][],
  storeNumber: string,
  col: number = 0
): unknown[] | null {
  for (const row of rows) {
    if (String(row[col] ?? "").trim() === storeNumber) {
      return row;
    }
  }
  return null;
}

export function toNum(val: unknown): number | null {
  if (val == null) return null;
  const n = typeof val === "number" ? val : Number(val);
  return isNaN(n) ? null : n;
}

export function safeDivide(a: number | null, b: number | null): number | null {
  if (a == null || b == null || b === 0) return null;
  return a / b;
}
