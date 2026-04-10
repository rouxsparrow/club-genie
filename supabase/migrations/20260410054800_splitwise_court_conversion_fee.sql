ALTER TABLE splitwise_settings
  ADD COLUMN IF NOT EXISTS court_conversion_fee_percent numeric(6,2) NOT NULL DEFAULT 1.00;
