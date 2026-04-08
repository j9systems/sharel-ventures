-- Add bank_upload_ids column to reconciliation_sessions
-- This column stores an array of all bank upload IDs used in a reconciliation run,
-- enabling multi-bank-statement reconciliation.
-- The existing bank_upload_id column is kept for FK compatibility.

ALTER TABLE reconciliation_sessions
  ADD COLUMN IF NOT EXISTS bank_upload_ids text[] NOT NULL DEFAULT '{}';

-- Backfill existing rows: copy the single bank_upload_id into the array
UPDATE reconciliation_sessions
  SET bank_upload_ids = ARRAY[bank_upload_id]
  WHERE bank_upload_id IS NOT NULL
    AND bank_upload_ids = '{}';
