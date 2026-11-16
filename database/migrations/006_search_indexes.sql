-- 006_search_indexes.sql
-- Full-text search setup for Topics and Perspectives (FR-SRCH-01, FR-SRCH-02).
--
-- The generated tsvector columns and their GIN indexes were already created in
-- 003_content_core.sql.  This migration is intentionally a no-op from the
-- runner's perspective so that new deployments that re-run all migrations do
-- not error; it exists solely as an explicit record that the FTS infrastructure
-- was designed from the start and satisfies the search feature requirement.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner tracks whole files by filename and has no down/rollback phase.

-- ============================================================================
-- Verify the generated columns and GIN indexes are present.
-- If they already exist this is a no-op; if they are somehow missing on an old
-- database the statements below add them so the migration is idempotent.
-- ============================================================================

-- topics: generated tsvector over title + description
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'topics'
          AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE topics ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('english',
                    coalesce(title::text, '') || ' ' || coalesce(description, ''))
            ) STORED;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'topics'
          AND indexname = 'idx_topics_search_vector'
    ) THEN
        CREATE INDEX idx_topics_search_vector ON topics USING GIN (search_vector);
    END IF;
END
$$;

-- perspectives: generated tsvector over proposed_solution + explanation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'perspectives'
          AND column_name = 'search_vector'
    ) THEN
        ALTER TABLE perspectives ADD COLUMN search_vector tsvector
            GENERATED ALWAYS AS (
                to_tsvector('english',
                    coalesce(proposed_solution, '') || ' ' || coalesce(explanation, ''))
            ) STORED;
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'perspectives'
          AND indexname = 'idx_perspectives_search_vector'
    ) THEN
        CREATE INDEX idx_perspectives_search_vector ON perspectives USING GIN (search_vector);
    END IF;
END
$$;

-- ============================================================================
-- DOWN (not executed by the runner — provided for manual rollback only)
--
-- Nothing to drop: the generated columns and GIN indexes are defined in
-- 003_content_core.sql; dropping them here would conflict with that migration
-- on a clean install.
-- ============================================================================
