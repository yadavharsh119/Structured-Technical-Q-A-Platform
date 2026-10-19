-- 002_auth_core.sql
-- Auth and audit core: extensions, enums, trigger functions, users,
-- oauth identities, sessions, verification/reset tokens, login attempts,
-- append-only audit logs.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner tracks whole files by filename and has no down/rollback phase,
-- so the rollback statements are kept at the bottom of this file as comments.

-- ============================================================================
-- Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS citext;

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE user_role AS ENUM ('registered', 'moderator', 'admin');

CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned', 'deactivated');

CREATE TYPE oauth_provider AS ENUM ('google', 'github');

-- ============================================================================
-- Functions
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Table: users
-- ============================================================================
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    username citext NOT NULL UNIQUE,
    email citext NOT NULL UNIQUE,
    password_hash text NULL,
    email_verified_at timestamptz NULL,
    role user_role NOT NULL DEFAULT 'registered',
    status user_status NOT NULL DEFAULT 'active',
    suspended_until timestamptz NULL,
    profile_picture_url text NULL,
    bio text NULL,
    technical_skills text[] NOT NULL DEFAULT '{}',
    areas_of_interest text[] NOT NULL DEFAULT '{}',
    email_public boolean NOT NULL DEFAULT false,
    fingerprint_public boolean NOT NULL DEFAULT true,
    failed_login_attempts integer NOT NULL DEFAULT 0,
    locked_until timestamptz NULL,
    last_login_at timestamptz NULL,
    sessions_valid_after timestamptz NULL,
    deactivated_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_username_length_check CHECK (char_length(username) BETWEEN 3 AND 30),
    CONSTRAINT users_bio_length_check CHECK (char_length(bio) <= 1000)
);

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Table: oauth_identities
-- ============================================================================
CREATE TABLE oauth_identities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider oauth_provider NOT NULL,
    provider_user_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT oauth_identities_provider_provider_user_id_key UNIQUE (provider, provider_user_id),
    CONSTRAINT oauth_identities_user_id_provider_key UNIQUE (user_id, provider)
);

-- ============================================================================
-- Table: sessions
-- ============================================================================
CREATE TABLE sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    ip_address inet NULL,
    user_agent text NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_active_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz NULL
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);

-- ============================================================================
-- Table: email_verification_tokens
-- ============================================================================
CREATE TABLE email_verification_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens (user_id);

-- ============================================================================
-- Table: password_reset_tokens
-- ============================================================================
CREATE TABLE password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- ============================================================================
-- Table: login_attempts
-- ============================================================================
CREATE TABLE login_attempts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    identifier text NOT NULL,
    ip_address inet NULL,
    success boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_attempts_ip_address_created_at ON login_attempts (ip_address, created_at);
CREATE INDEX idx_login_attempts_identifier_created_at ON login_attempts (identifier, created_at);

-- ============================================================================
-- Table: audit_logs (append-only)
-- ============================================================================
CREATE OR REPLACE FUNCTION audit_logs_block_changes() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$;

CREATE TABLE audit_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    actor_user_id uuid NULL,
    action text NOT NULL,
    target_type text NULL,
    target_id text NULL,
    ip_address inet NULL,
    result text NOT NULL CHECK (result IN ('success', 'failure')),
    metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs (action);

CREATE TRIGGER audit_logs_block_changes
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_logs_block_changes();

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts — the runner applies each file
-- once and records it by filename; it has no rollback phase). Kept here for
-- manual use only, in reverse creation order:
--
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS login_attempts;
-- DROP TABLE IF EXISTS password_reset_tokens;
-- DROP TABLE IF EXISTS email_verification_tokens;
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS oauth_identities;
-- DROP TABLE IF EXISTS users;
-- DROP FUNCTION IF EXISTS audit_logs_block_changes();
-- DROP FUNCTION IF EXISTS set_updated_at();
-- DROP TYPE IF EXISTS oauth_provider;
-- DROP TYPE IF EXISTS user_status;
-- DROP TYPE IF EXISTS user_role;
-- (citext is not dropped: 001_initial_schema.sql already created it)
-- ============================================================================


