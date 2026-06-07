/* MIGRATION-005: Add winner_id to predictions and official_results */
/* NON-DESTRUCTIVE — adds nullable columns only. */

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS winner_id TEXT NULL;
ALTER TABLE official_results ADD COLUMN IF NOT EXISTS winner_id TEXT NULL;
