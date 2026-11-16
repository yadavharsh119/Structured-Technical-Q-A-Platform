-- 004_votes_moderation.sql
-- Voting, moderation and admin: perspective votes, deletion requests, reports,
-- user actions, expert fingerprints, system settings.
-- Depends on 002_auth_core.sql (users) and 003_content_core.sql
-- (categories, topics, perspectives).
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner has no down/rollback phase, so rollback statements are kept at
-- the bottom as comments (see "DOWN").

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE report_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');

CREATE TYPE report_reason AS ENUM ('spam', 'offensive', 'duplicate', 'misleading', 'plagiarism', 'other');

CREATE TYPE report_target_type AS ENUM ('topic', 'perspective');

CREATE TYPE user_action_type AS ENUM ('warning', 'suspend', 'ban', 'restore');

-- ============================================================================
-- Table: perspective_votes
-- ============================================================================
CREATE TABLE perspective_votes (
    user_id uuid NOT NULL REFERENCES users(id),
    perspective_id uuid NOT NULL REFERENCES perspectives(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, perspective_id)
);

CREATE INDEX idx_perspective_votes_perspective_id ON perspective_votes (perspective_id);

-- ============================================================================
-- Table: perspective_deletion_requests
-- ============================================================================
CREATE TABLE perspective_deletion_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    perspective_id uuid NOT NULL REFERENCES perspectives(id),
    requested_by uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    reviewed_by uuid NULL REFERENCES users(id),
    reviewed_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_perspective_deletion_requests_status ON perspective_deletion_requests (status);

-- ============================================================================
-- Table: reports
-- ============================================================================
CREATE TABLE reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES users(id),
    target_type report_target_type NOT NULL,
    target_id uuid NOT NULL,
    reason report_reason NOT NULL,
    comments text NULL,
    status report_status NOT NULL DEFAULT 'open',
    handled_by uuid NULL REFERENCES users(id),
    handled_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reports_reporter_target_key UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX idx_reports_status ON reports (status);

-- ============================================================================
-- Table: user_actions
-- ============================================================================
CREATE TABLE user_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    admin_id uuid NOT NULL REFERENCES users(id),
    action_type user_action_type NOT NULL,
    reason text NOT NULL,
    suspended_until timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_actions_user_id ON user_actions (user_id);

-- ============================================================================
-- Table: expert_fingerprints
-- ============================================================================
CREATE TABLE expert_fingerprints (
    user_id uuid NOT NULL REFERENCES users(id),
    category_id uuid NOT NULL REFERENCES categories(id),
    perspective_count integer NOT NULL DEFAULT 0,
    upvote_total integer NOT NULL DEFAULT 0,
    score numeric NOT NULL DEFAULT 0,
    calculated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, category_id)
);

-- ============================================================================
-- Table: system_settings
-- ============================================================================
CREATE TABLE system_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_by uuid NULL REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts — the runner applies each file
-- once and records it by filename; it has no rollback phase). Provided for
-- manual use only, in reverse creation order (run this BEFORE the 003 down):
--
-- DROP TABLE IF EXISTS system_settings;
-- DROP TABLE IF EXISTS expert_fingerprints;
-- DROP TABLE IF EXISTS user_actions;
-- DROP TABLE IF EXISTS reports;
-- DROP TABLE IF EXISTS perspective_deletion_requests;
-- DROP TABLE IF EXISTS perspective_votes;
-- DROP TYPE IF EXISTS user_action_type;
-- DROP TYPE IF EXISTS report_target_type;
-- DROP TYPE IF EXISTS report_reason;
-- DROP TYPE IF EXISTS report_status;
-- DROP TYPE IF EXISTS request_status;
-- ============================================================================

