-- 011_admin_user_management.sql
-- Admin user management and audit log viewer (FR-MOD-03, FR-ADM-01,
-- FR-ADM-03).
--
-- 002_auth_core.sql already created:
--   * users.status      (active | suspended | banned | deactivated)
--   * users.suspended_until
--   * audit_logs        (id, created_at, actor_user_id, action, target_type,
--                        target_id, ip_address, result, metadata)
-- Those columns match the required audit fields (timestamp/actor_id/ip/details
-- are exposed under their API names). The guards below make this migration
-- safe on schemas created before those columns existed.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner has no down/rollback phase, so rollback statements are kept at
-- the bottom as comments (see "DOWN").

-- ============================================================================
-- Users: status + suspended_until
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'suspended_until'
    ) THEN
        ALTER TABLE users ADD COLUMN suspended_until timestamptz NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'deactivated');
    ELSE
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'user_status' AND e.enumlabel = 'suspended'
        ) THEN
            ALTER TYPE user_status ADD VALUE 'suspended';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'user_status' AND e.enumlabel = 'banned'
        ) THEN
            ALTER TYPE user_status ADD VALUE 'banned';
        END IF;
    END IF;
END
$$;

-- ============================================================================
-- Table: user_warnings
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_warnings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    issued_by uuid NOT NULL REFERENCES users(id),
    reason text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user_id ON user_warnings (user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_issued_by ON user_warnings (issued_by);

-- ============================================================================
-- Audit logs: keep append-only + add target lookup
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON audit_logs (target_type, target_id);

CREATE OR REPLACE FUNCTION audit_logs_block_changes() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

-- Recreate the guard so the append-only guarantee is present even if an
-- earlier schema never created the trigger.
DROP TRIGGER IF EXISTS audit_logs_block_changes ON audit_logs;

CREATE TRIGGER audit_logs_block_changes
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_logs_block_changes();

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts - the runner applies each file
-- once and records it by filename; it has no rollback phase). Kept here for
-- manual use only:
--
-- DROP TRIGGER IF EXISTS audit_logs_block_changes ON audit_logs;
-- DROP INDEX IF EXISTS idx_audit_logs_target;
-- DROP TABLE IF EXISTS user_warnings;
-- ============================================================================
