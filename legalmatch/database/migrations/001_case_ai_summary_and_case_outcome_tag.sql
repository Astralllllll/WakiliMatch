-- ============================================================
-- Migration 001: ai_summary on ClientIssues, outcome_tag on PastCases
-- Deliverable 3, section B5. Additive only - no existing column, table,
-- or constraint is touched. Idempotent: safe to run against a database
-- that already has these columns (e.g. one created fresh from the
-- updated database/database.sql rather than migrated).
-- ============================================================

ALTER TABLE ClientIssues ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE PastCases ADD COLUMN IF NOT EXISTS outcome_tag VARCHAR(20);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pastcases_outcome_tag_check'
    ) THEN
        ALTER TABLE PastCases
            ADD CONSTRAINT pastcases_outcome_tag_check
            CHECK (outcome_tag IN ('won', 'settled', 'ongoing', 'lost', 'withdrawn'));
    END IF;
END $$;
