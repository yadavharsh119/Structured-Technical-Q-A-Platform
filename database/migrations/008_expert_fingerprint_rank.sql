-- 008_expert_fingerprint_rank.sql
-- FR-EXP-01/02: rank the top three categories in each user's expert fingerprint.
-- expert_fingerprints was created by 004_votes_moderation.sql; this migration
-- only adds the rank column required by the fingerprint calculation.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.

ALTER TABLE expert_fingerprints
    ADD COLUMN rank integer NOT NULL DEFAULT 0;

CREATE INDEX expert_fingerprints_user_rank_idx
    ON expert_fingerprints (user_id, rank);

-- DOWN (NOT executed by scripts/migrate.ts — kept for manual use only):
--
-- DROP INDEX IF EXISTS expert_fingerprints_user_rank_idx;
-- ALTER TABLE expert_fingerprints DROP COLUMN IF EXISTS rank;
