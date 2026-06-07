/* MIGRATION-006: Add r32_overrides JSONB column to games table */
/* NON-DESTRUCTIVE — adds nullable column only. */
/* Format: { "matchId": "teamId", ... } mapping R32 match IDs to third-place team IDs */

ALTER TABLE games ADD COLUMN IF NOT EXISTS r32_overrides JSONB NULL;
