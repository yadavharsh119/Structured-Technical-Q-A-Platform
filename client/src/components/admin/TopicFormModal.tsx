import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import {
  QUESTION_TAGS_MAX,
  TOPIC_DESCRIPTION_MAX,
  TOPIC_SLUG_MAX,
  TOPIC_TITLE_MAX,
  topicCreateSchema,
  topicUpdateSchema,
} from '@structured-qa/shared';
import { Button } from '../ui/Button';
import { createTopic, updateTopic } from '../../api/topics';
import { listCategories, listTags } from '../../api/taxonomy';
import type { Category, Tag, Topic } from '../../api/types';
import { fieldErrorsFromIssues } from '../../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const textareaClass =
  'w-full rounded-lg border border-line bg-white p-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'mb-1 block text-sm font-semibold text-ink';
const errorClass = 'mt-1 text-sm font-medium text-red-600';

interface TopicFormModalProps {
  topic?: Topic;
  onClose: () => void;
  onSaved: (topic: Topic, mode: 'create' | 'edit') => void;
}

export function TopicFormModal({ topic, onClose, onSaved }: TopicFormModalProps) {
  const isEdit = topic !== undefined;

  const [title, setTitle] = useState(topic?.title ?? '');
  const [description, setDescription] = useState(topic?.description ?? '');
  const [categoryId, setCategoryId] = useState(topic?.categoryId ?? '');
  const [slug, setSlug] = useState(topic?.slug ?? '');
  const [tagIds, setTagIds] = useState<string[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([listCategories(), listTags()]).then(([categoriesResponse, tagsResponse]) => {
      if (cancelled) return;

      if (!categoriesResponse.success) {
        setTaxonomyError(categoriesResponse.error.message);
        setTaxonomyLoading(false);
        return;
      }
      if (!tagsResponse.success) {
        setTaxonomyError(tagsResponse.error.message);
        setTaxonomyLoading(false);
        return;
      }

      const loadedTags = tagsResponse.data.tags;
      setCategories(categoriesResponse.data.categories);
      setTags(loadedTags);
      if (topic) {
        setTagIds(
          loadedTags
            .filter((tag) => topic.tags.includes(tag.name))
            .map((tag) => tag.id),
        );
      }
      setTaxonomyLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [topic]);

  const toggleTag = (tagId: string) => {
    setTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId);
      if (prev.length >= QUESTION_TAGS_MAX) return prev;
      return [...prev, tagId];
    });
  };

  const handleApiError = (code: string, message: string) => {
    if (code === 'TOPIC_TITLE_EXISTS') {
      setFieldErrors({ title: message });
      return;
    }
    if (code === 'TOPIC_SLUG_EXISTS') {
      setFieldErrors({ slug: message });
      return;
    }
    if (code === 'VALIDATION_ERROR') {
      const knownFields = ['title', 'description', 'categoryId', 'tagIds', 'slug'];
      const nextErrors: Record<string, string> = {};
      for (const part of message.split(',')) {
        const field = part.trim();
        if (knownFields.includes(field)) {
          nextErrors[field] = 'This value is invalid.';
        }
      }
      if (message.toLowerCase().includes('category')) {
        nextErrors.categoryId = message;
      } else if (message.toLowerCase().includes('tag')) {
        nextErrors.tagIds = message;
      }
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
    }
    setGeneralError(message);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const base = {
      title,
      description,
      categoryId,
      tagIds,
    };

    if (isEdit) {
      const parsed = topicUpdateSchema.safeParse({ ...base, slug });
      if (!parsed.success) {
        setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
        return;
      }

      setSubmitting(true);
      const response = await updateTopic(topic.id, parsed.data);
      setSubmitting(false);

      if (!response.success) {
        handleApiError(response.error.code, response.error.message);
        return;
      }

      onSaved(response.data.topic, 'edit');
      return;
    }

    const parsed = topicCreateSchema.safeParse(base);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }

    setSubmitting(true);
    const response = await createTopic(parsed.data);
    setSubmitting(false);

    if (!response.success) {
      handleApiError(response.error.code, response.error.message);
      return;
    }

    onSaved(response.data.topic, 'create');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-form-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="topic-form-title" className="font-serif text-lg font-bold text-ink">
            {isEdit ? 'Edit topic' : 'Create curated topic'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close topic form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {taxonomyError && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{taxonomyError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="topic-title" className={labelClass}>
              Title
            </label>
            <input
              id="topic-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={TOPIC_TITLE_MAX}
              data-testid="topic-title-input"
              className={inputClass}
            />
            {fieldErrors.title && <p className={errorClass}>{fieldErrors.title}</p>}
          </div>

          <div>
            <label htmlFor="topic-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="topic-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={TOPIC_DESCRIPTION_MAX}
              data-testid="topic-description-input"
              className={textareaClass}
            />
            {fieldErrors.description && (
              <p className={errorClass}>{fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="topic-category" className={labelClass}>
              Category
            </label>
            <select
              id="topic-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={taxonomyLoading}
              data-testid="topic-category-select"
              className={inputClass}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {fieldErrors.categoryId && (
              <p className={errorClass}>{fieldErrors.categoryId}</p>
            )}
          </div>

          <fieldset>
            <legend className={labelClass}>
              Tags <span className="font-normal text-muted">(up to {QUESTION_TAGS_MAX})</span>
            </legend>
            {taxonomyLoading ? (
              <p className="text-sm text-muted">Loading tags...</p>
            ) : (
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-lg border border-line p-3">
                {tags.map((tag) => (
                  <label
                    key={tag.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium text-body"
                  >
                    <input
                      type="checkbox"
                      checked={tagIds.includes(tag.id)}
                      onChange={() => toggleTag(tag.id)}
                      data-testid={`topic-tag-${tag.id}`}
                      className="h-3.5 w-3.5 rounded accent-black"
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
            {fieldErrors.tagIds && <p className={errorClass}>{fieldErrors.tagIds}</p>}
          </fieldset>

          {isEdit && (
            <div>
              <label htmlFor="topic-slug" className={labelClass}>
                Slug
              </label>
              <input
                id="topic-slug"
                type="text"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                maxLength={TOPIC_SLUG_MAX}
                data-testid="topic-slug-input"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted">
                Changing the slug keeps the old URL working by redirecting it to the new one.
              </p>
              {fieldErrors.slug && <p className={errorClass}>{fieldErrors.slug}</p>}
            </div>
          )}

          {generalError && (
            <div
              role="alert"
              data-testid="topic-form-error"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{generalError}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-line pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || taxonomyLoading}
              data-testid="topic-form-submit"
            >
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save changes'
                  : 'Create topic'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
