-- 003_content_core.sql
-- Content core: categories, tags, questions, topics, perspectives, attachments.
-- Depends on 002_auth_core.sql (users table, set_updated_at() function).
--
-- Applied by scripts/migrate.ts as a single script inside one transaction.
-- The runner tracks whole files by filename and has no down/rollback phase,
-- so rollback statements are kept at the bottom as comments (see "DOWN").

-- ============================================================================
-- Enums
-- ============================================================================
CREATE TYPE question_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE topic_status AS ENUM ('published', 'archived', 'hidden');

CREATE TYPE perspective_status AS ENUM ('visible', 'hidden', 'deleted');

-- ============================================================================
-- Table: categories
-- ============================================================================
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name citext NOT NULL UNIQUE,
    description text NULL,
    parent_id uuid NULL REFERENCES categories(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT categories_parent_check CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE TRIGGER categories_set_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Table: tags
-- ============================================================================
CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name citext NOT NULL UNIQUE,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table: questions
-- ============================================================================
CREATE TABLE questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id uuid NOT NULL REFERENCES users(id),
    title varchar(200) NOT NULL,
    description text NOT NULL CHECK (char_length(description) <= 5000),
    category_id uuid NOT NULL REFERENCES categories(id),
    tech_stack text NULL,
    status question_status NOT NULL DEFAULT 'pending',
    rejection_reason text NULL,
    reviewed_by uuid NULL REFERENCES users(id),
    reviewed_at timestamptz NULL,
    flagged boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER questions_set_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_questions_status ON questions (status);
CREATE INDEX idx_questions_author_id ON questions (author_id);

-- ============================================================================
-- Table: question_tags
-- ============================================================================
CREATE TABLE question_tags (
    question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id),
    PRIMARY KEY (question_id, tag_id)
);

-- ============================================================================
-- Table: topics
-- ============================================================================
CREATE TABLE topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title citext NOT NULL UNIQUE,
    slug text NOT NULL UNIQUE,
    description text NOT NULL,
    category_id uuid NOT NULL REFERENCES categories(id),
    is_curated boolean NOT NULL DEFAULT false,
    status topic_status NOT NULL DEFAULT 'published',
    created_by uuid NOT NULL REFERENCES users(id),
    merged_into_topic_id uuid NULL REFERENCES topics(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER topics_set_updated_at
    BEFORE UPDATE ON topics
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_topics_status ON topics (status);
CREATE INDEX idx_topics_category_id ON topics (category_id);

ALTER TABLE topics ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title::text, '') || ' ' || coalesce(description, ''))
    ) STORED;

CREATE INDEX idx_topics_search_vector ON topics USING GIN (search_vector);

-- ============================================================================
-- Table: topic_tags
-- ============================================================================
CREATE TABLE topic_tags (
    topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id),
    PRIMARY KEY (topic_id, tag_id)
);

-- ============================================================================
-- Table: topic_questions
-- ============================================================================
CREATE TABLE topic_questions (
    question_id uuid PRIMARY KEY REFERENCES questions(id),
    topic_id uuid NOT NULL REFERENCES topics(id),
    linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_topic_questions_topic_id ON topic_questions (topic_id);

-- ============================================================================
-- Table: topic_slug_redirects
-- ============================================================================
CREATE TABLE topic_slug_redirects (
    old_slug text PRIMARY KEY,
    topic_id uuid NOT NULL REFERENCES topics(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Table: perspectives (immutable content)
-- ============================================================================
CREATE TABLE perspectives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id uuid NOT NULL REFERENCES topics(id),
    author_id uuid NOT NULL REFERENCES users(id),
    proposed_solution text NOT NULL,
    explanation text NOT NULL,
    advantages text[] NOT NULL CHECK (array_length(advantages, 1) >= 1),
    limitations text[] NOT NULL CHECK (array_length(limitations, 1) >= 1),
    code_snippets jsonb NOT NULL DEFAULT '[]',
    reference_urls text[] NOT NULL DEFAULT '{}',
    status perspective_status NOT NULL DEFAULT 'visible',
    flagged boolean NOT NULL DEFAULT false,
    deleted_at timestamptz NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT perspectives_topic_id_author_id_key UNIQUE (topic_id, author_id)
);

CREATE INDEX idx_perspectives_topic_id ON perspectives (topic_id);
CREATE INDEX idx_perspectives_author_id ON perspectives (author_id);

ALTER TABLE perspectives ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(proposed_solution, '') || ' ' || coalesce(explanation, ''))
    ) STORED;

CREATE INDEX idx_perspectives_search_vector ON perspectives USING GIN (search_vector);

CREATE OR REPLACE FUNCTION perspectives_block_content_update() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.topic_id IS DISTINCT FROM OLD.topic_id
        OR NEW.author_id IS DISTINCT FROM OLD.author_id
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

CREATE TRIGGER perspectives_block_content_update
    BEFORE UPDATE ON perspectives
    FOR EACH ROW
    EXECUTE FUNCTION perspectives_block_content_update();

-- ============================================================================
-- Table: attachments
-- ============================================================================
CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_id uuid NOT NULL REFERENCES users(id),
    question_id uuid NULL REFERENCES questions(id) ON DELETE CASCADE,
    perspective_id uuid NULL REFERENCES perspectives(id) ON DELETE CASCADE,
    original_name text NOT NULL,
    stored_path text NOT NULL,
    mime_type text NOT NULL,
    size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT attachments_exactly_one_parent_check
        CHECK ((question_id IS NOT NULL)::int + (perspective_id IS NOT NULL)::int = 1)
);

-- ============================================================================
-- DOWN (NOT executed by scripts/migrate.ts — the runner applies each file once
-- and records it by filename; it has no rollback phase). Provided for manual
-- use only, in reverse creation order. Run the 004 down first:
--
-- DROP TABLE IF EXISTS attachments;
-- DROP TABLE IF EXISTS perspectives;
-- DROP TABLE IF EXISTS topic_slug_redirects;
-- DROP TABLE IF EXISTS topic_questions;
-- DROP TABLE IF EXISTS topic_tags;
-- DROP TABLE IF EXISTS topics;
-- DROP TABLE IF EXISTS question_tags;
-- DROP TABLE IF EXISTS questions;
-- DROP TABLE IF EXISTS tags;
-- DROP TABLE IF EXISTS categories;
-- DROP FUNCTION IF EXISTS perspectives_block_content_update();
-- DROP TYPE IF EXISTS perspective_status;
-- DROP TYPE IF EXISTS topic_status;
-- DROP TYPE IF EXISTS question_status;
-- ============================================================================


