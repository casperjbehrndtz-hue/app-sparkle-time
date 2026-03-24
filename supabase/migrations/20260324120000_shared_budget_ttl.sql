-- Add expiry to shared budgets (90 days) and cleanup
ALTER TABLE shared_budgets ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '90 days');

-- Update existing rows to expire in 90 days from creation
UPDATE shared_budgets SET expires_at = created_at + interval '90 days' WHERE expires_at IS NULL;
