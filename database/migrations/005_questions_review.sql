-- 005_questions_review.sql
-- Questions + review queue: link from approved questions to topics, and
-- taxonomy seed data.
--
-- The content tables themselves (categories, tags, questions, question_tags,
-- topics, topic_tags) were created in 003_content_core.sql. This migration
-- adds the question -> topic link column used by the review flow and seeds
-- the taxonomy with the launch categories and common tags.
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner tracks whole files by filename and has no down/rollback phase,
-- so rollback statements are kept at the bottom as comments (see "DOWN").

-- ============================================================================
-- Question -> Topic link (FR-QST-02 / FR-TOP-01)
-- Set when a moderator approves a question by linking it to an existing
-- topic or by creating a new topic from it.
-- ============================================================================
ALTER TABLE questions ADD COLUMN topic_id uuid NULL REFERENCES topics(id);

CREATE INDEX idx_questions_topic_id ON questions (topic_id);

-- ============================================================================
-- Seed: categories (FR-QST-01)
-- ============================================================================
INSERT INTO categories (name, description) VALUES
    ('Debugging', 'Questions about diagnosing and fixing errors, crashes, and unexpected behavior.'),
    ('System Design', 'Questions about designing scalable architectures, data flows, and system trade-offs.'),
    ('Technology Comparison', 'Questions comparing frameworks, languages, tools, and platforms.'),
    ('Security', 'Questions about authentication, vulnerabilities, encryption, and secure coding.'),
    ('Performance', 'Questions about optimizing speed, memory usage, and scalability.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Seed: tags (common technical tags)
-- ============================================================================
INSERT INTO tags (name) VALUES
    ('react'),
    ('typescript'),
    ('javascript'),
    ('nodejs'),
    ('python'),
    ('java'),
    ('go'),
    ('postgresql'),
    ('mongodb'),
    ('redis'),
    ('docker'),
    ('kubernetes'),
    ('api-design'),
    ('security'),
    ('performance')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts — the runner applies each file
-- once and records it by filename; it has no rollback phase). Provided for
-- manual use only:
--
-- DROP INDEX IF EXISTS idx_questions_topic_id;
-- ALTER TABLE questions DROP COLUMN IF EXISTS topic_id;
-- DELETE FROM tags WHERE name IN ('react','typescript','javascript','nodejs','python','java','go','postgresql','mongodb','redis','docker','kubernetes','api-design','security','performance');
-- DELETE FROM categories WHERE name IN ('Debugging','System Design','Technology Comparison','Security','Performance');
-- ============================================================================
