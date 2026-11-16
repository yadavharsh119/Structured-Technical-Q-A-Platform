-- 010_perspective_deletion_requests.sql
-- FR-PSP-03: author-initiated deletion requests and administrative removal.
-- Depends on 002_auth_core.sql (users), 003_content_core.sql (perspectives)
-- and 004_votes_moderation.sql (request_status enum).
--
-- The older perspective_deletion_requests table from 004 is left untouched;
-- this migration introduces the table used by the deletion-request workflow.

-- ============================================================================
-- Table: deletion_requests
-- ============================================================================
CREATE TABLE deletion_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    perspective_id uuid NOT NULL REFERENCES perspectives(id) ON DELETE CASCADE,
    requester_id uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    decided_by uuid NULL REFERENCES users(id),
    decision_note text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    decided_at timestamptz NULL
);

CREATE INDEX idx_deletion_requests_status ON deletion_requests (status);
CREATE INDEX idx_deletion_requests_perspective_id ON deletion_requests (perspective_id);

-- Only one pending request per perspective.
CREATE UNIQUE INDEX deletion_requests_one_pending_per_perspective
    ON deletion_requests (perspective_id)
    WHERE status = 'pending';

-- FR-PSP-03: soft-deleted perspectives stay in the database but must be
-- excluded from every public read path. The column already exists in
-- 003_content_core.sql; IF NOT EXISTS keeps this migration re-runnable.
ALTER TABLE perspectives
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_perspectives_deleted_at ON perspectives (deleted_at);

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts - kept for manual use only)
-- ============================================================================
-- DROP INDEX IF EXISTS idx_perspectives_deleted_at;
-- DROP INDEX IF EXISTS deletion_requests_one_pending_per_perspective;
-- DROP INDEX IF EXISTS idx_deletion_requests_perspective_id;
-- DROP INDEX IF EXISTS idx_deletion_requests_status;
-- DROP TABLE IF EXISTS deletion_requests;
