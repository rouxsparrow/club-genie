-- Shuttlecock split feature + multi-expense-per-session model.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'expense_type') THEN
    CREATE TYPE expense_type AS ENUM ('COURT', 'SHUTTLECOCK');
  END IF;
END $$;
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS shuttlecock_paid boolean NOT NULL DEFAULT false;
ALTER TABLE splitwise_settings
  ADD COLUMN IF NOT EXISTS shuttlecock_fee numeric(10,2) NOT NULL DEFAULT 4.00;
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS expense_type expense_type;
UPDATE expenses
SET expense_type = 'COURT'
WHERE expense_type IS NULL;
ALTER TABLE expenses
  ALTER COLUMN expense_type SET DEFAULT 'COURT',
  ALTER COLUMN expense_type SET NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'expenses_session_id_key'
      AND conrelid = 'expenses'::regclass
  ) THEN
    ALTER TABLE expenses DROP CONSTRAINT expenses_session_id_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS expenses_session_id_expense_type_idx
ON expenses (session_id, expense_type);
