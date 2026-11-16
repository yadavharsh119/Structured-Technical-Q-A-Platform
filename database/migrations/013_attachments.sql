-- Attachments: allow unlinked uploads and store the generated file name.
-- The base attachments table was created in 003_content_core.sql.

ALTER TABLE attachments RENAME COLUMN stored_path TO stored_name;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_exactly_one_parent_check;

-- An attachment is either unlinked (both null) or linked to exactly one parent.
ALTER TABLE attachments
    ADD CONSTRAINT attachments_exactly_one_parent_check
    CHECK (question_id IS NULL OR perspective_id IS NULL);

CREATE INDEX IF NOT EXISTS attachments_question_id_idx ON attachments (question_id);
CREATE INDEX IF NOT EXISTS attachments_perspective_id_idx ON attachments (perspective_id);
CREATE INDEX IF NOT EXISTS attachments_uploader_id_idx ON attachments (uploader_id);
