export interface Entity {
  id: string;
  name: string;
}

export interface Store {
  id: string;
  entity_id: string;
  store_number: string;
  display_name: string;
}

export interface RTIUpload {
  id: string;
  entity_id: string;
  file_name: string;
  date_from: string;
  date_to: string;
  row_count: number;
  deposit_row_count: number;
  uploaded_at: string;
}

export interface RTITransaction {
  id: string;
  upload_id: string;
  store_number: string;
  transaction_date: string;
  raw_label: string;
  transaction_type: string;
  type_code: number;
  is_deposit: boolean;
  amount: number;
  created_at: string;
}

export interface BankUpload {
  id: string;
  entity_id: string;
  file_name: string;
  file_format: string;
  bank_name: string;
  account_number: string;
  date_from: string;
  date_to: string;
  row_count: number;
  uploaded_at: string;
}

export interface BankTransaction {
  id: string;
  upload_id: string;
  post_date: string;
  description: string;
  credit: number | null;
  debit: number | null;
  status: string;
  transaction_category: string;
  store_number: string | null;
  created_at: string;
}

export interface ReconciliationSession {
  id: string;
  entity_id: string;
  rti_upload_id: string;
  bank_upload_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  total_rti_deposits: number;
  total_bank_deposits: number;
  matched_count: number;
  discrepancy_count: number;
  unmatched_rti_count: number;
  unmatched_bank_count: number;
}

export interface ReconciliationResult {
  id: string;
  session_id: string;
  rti_transaction_id: string | null;
  bank_transaction_id: string | null;
  match_status: "matched" | "discrepancy" | "rti_only" | "bank_only";
  rti_amount: number | null;
  bank_amount: number | null;
  delta: number | null;
  reviewed: boolean;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

export type MatchStatus = ReconciliationResult["match_status"];

export interface ReconciliationResultWithDetails extends ReconciliationResult {
  rti_transaction?: RTITransaction | null;
  bank_transaction?: BankTransaction | null;
}

export interface ParsedRTIRow {
  store_number: string;
  transaction_date: string;
  raw_label: string;
  transaction_type: string;
  type_code: number;
  is_deposit: boolean;
  amount: number;
}

export interface ParsedBankRow {
  account_number: string;
  post_date: string;
  check: string;
  description: string;
  debit: number | null;
  credit: number | null;
  status: string;
  transaction_category: string;
  store_number: string | null;
}

export interface ParseResult<T> {
  rows: T[];
  dateFrom: string;
  dateTo: string;
  errors: string[];
}

export interface BankParser {
  parse(
    fileBuffer: Buffer,
    fileName: string
  ): ParseResult<ParsedBankRow>;
}
