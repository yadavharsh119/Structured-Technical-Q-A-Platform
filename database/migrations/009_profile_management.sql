-- 009_profile_management.sql
-- FR-PROF-01/02: editable profile fields and email privacy.
--
-- These columns were originally introduced with the users table in
-- 002_auth_core.sql. The IF NOT EXISTS clauses keep this migration safe for
-- databases created before they were part of the auth core.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS bio text NULL,
    ADD COLUMN IF NOT EXISTS technical_skills text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS areas_of_interest text[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS email_public boolean NOT NULL DEFAULT false;

-- DOWN (NOT executed by scripts/migrate.ts — kept for manual use only):
--
-- ALTER TABLE users DROP COLUMN IF EXISTS email_public;
-- ALTER TABLE users DROP COLUMN IF EXISTS areas_of_interest;
-- ALTER TABLE users DROP COLUMN IF EXISTS technical_skills;
-- ALTER TABLE users DROP COLUMN IF EXISTS bio;
