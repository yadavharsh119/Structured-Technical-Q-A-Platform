-- 007_moderation_reports.sql
-- FR-MOD-01 / FR-MOD-02: content reporting and the moderator queue.
-- Adapts the reports table created in 004_votes_moderation.sql to the
-- moderation API shape and adds moderation hide flags to content.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.

-- ============================================================================
-- Reports: align column and enum names with the moderation API
-- ============================================================================
ALTER TYPE report_reason RENAME VALUE 'offensive' TO 'abusive';

ALTER TABLE reports RENAME COLUMN comments TO comment;
ALTER TABLE reports RENAME COLUMN handled_by TO resolved_by;

ALTER TABLE reports
    ADD CONSTRAINT reports_other_comment_check
    CHECK (reason <> 'other' OR (comment IS NOT NULL AND btrim(comment) <> ''));

CREATE INDEX idx_reports_target ON reports (target_type, target_id);

-- ============================================================================
-- Moderation hide flags
-- ============================================================================
ALTER TABLE topics
    ADD COLUMN hidden boolean NOT NULL DEFAULT false;

ALTER TABLE perspectives
    ADD COLUMN hidden boolean NOT NULL DEFAULT false;

CREATE INDEX idx_topics_hidden ON topics (hidden);
CREATE INDEX idx_perspectives_hidden ON perspectives (hidden);

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts — the runner applies each file once
-- and records it by filename; it has no rollback phase). Provided for manual use
-- only.
--
-- DROP INDEX IF EXISTS idx_perspectives_hidden;
-- DROP INDEX IF EXISTS idx_topics_hidden;
-- ALTER TABLE perspectives DROP COLUMN IF EXISTS hidden;
-- ALTER TABLE topics DROP COLUMN IF EXISTS hidden;
-- DROP INDEX IF EXISTS idx_reports_target;
-- ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_other_comment_check;
-- ALTER TABLE reports RENAME COLUMN resolved_by TO handled_by;
-- ALTER TABLE reports RENAME COLUMN comment TO comments;
-- ALTER TYPE report_reason RENAME VALUE 'abusive' TO 'offensive';
-- ============================================================================
