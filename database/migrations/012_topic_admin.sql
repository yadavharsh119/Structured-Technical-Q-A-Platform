-- 012_topic_admin.sql
-- Topic administration: archived status and slug redirects (FR-TOP-01 - FR-TOP-04).
--
-- 003_content_core.sql already created topic_status with 'archived' and the
-- topic_slug_redirects table on fresh databases. Every statement below is
-- guarded so this migration is also safe on schemas created before those
-- definitions existed.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner has no down/rollback phase, so rollback statements are kept at
-- the bottom as comments (see "DOWN").

-- ============================================================================
-- topic_status: ensure the 'archived' label exists
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'topic_status' AND e.enumlabel = 'archived'
    ) THEN
        ALTER TYPE topic_status ADD VALUE 'archived';
    END IF;
END
$$;

-- ============================================================================
-- Table: topic_slug_redirects
-- ============================================================================
CREATE TABLE IF NOT EXISTS topic_slug_redirects (
    old_slug text PRIMARY KEY,
    topic_id uuid NOT NULL REFERENCES topics(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topic_slug_redirects_topic_id
    ON topic_slug_redirects (topic_id);

-- ============================================================================
-- Perspectives: allow moving a perspective between topics during a merge
-- while keeping the perspective content itself immutable.
-- ============================================================================
CREATE OR REPLACE FUNCTION perspectives_block_content_update() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- topic_id is intentionally mutable: FR-TOP-03 moves perspectives from a
    -- merged source topic to its destination. Status, voting and moderation
    -- columns remain mutable as before.
    IF NEW.author_id IS DISTINCT FROM OLD.author_id
        OR NEW.proposed_solution IS DISTINCT FROM OLD.proposed_solution
        OR NEW.explanation IS DISTINCT FROM OLD.explanation
        OR NEW.advantages IS DISTINCT FROM OLD.advantages
        OR NEW.limitations IS DISTINCT FROM OLD.limitations
        OR NEW.code_snippets IS DISTINCT FROM OLD.code_snippets
        OR NEW.reference_urls IS DISTINCT FROM OLD.reference_urls
    THEN
        RAISE EXCEPTION 'perspectives are immutable';
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts - the runner applies each file
-- once and records it by filename; it has no rollback phase). Kept here for
-- manual use only:
--
-- CREATE OR REPLACE FUNCTION perspectives_block_content_update() RETURNS trigger
-- LANGUAGE plpgsql
-- AS $$
-- BEGIN
--     IF NEW.topic_id IS DISTINCT FROM OLD.topic_id
--         OR NEW.author_id IS DISTINCT FROM OLD.author_id
--         OR NEW.proposed_solution IS DISTINCT FROM OLD.proposed_solution
--         OR NEW.explanation IS DISTINCT FROM OLD.explanation
--         OR NEW.advantages IS DISTINCT FROM OLD.advantages
--         OR NEW.limitations IS DISTINCT FROM OLD.limitations
--         OR NEW.code_snippets IS DISTINCT FROM OLD.code_snippets
--         OR NEW.reference_urls IS DISTINCT FROM OLD.reference_urls
--     THEN
--         RAISE EXCEPTION 'perspectives are immutable';
--     END IF;
--     RETURN NEW;
-- END;
-- $$;
-- DROP INDEX IF EXISTS idx_topic_slug_redirects_topic_id;
-- DROP TABLE IF EXISTS topic_slug_redirects;
-- ============================================================================
