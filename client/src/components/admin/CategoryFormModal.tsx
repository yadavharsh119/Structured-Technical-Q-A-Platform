import { useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import {
  CATEGORY_DESCRIPTION_MAX,
  CATEGORY_NAME_MAX,
  categoryCreateSchema,
  categoryUpdateSchema,
} from '@structured-qa/shared';
import { Button } from '../ui/Button';
import { createAdminCategory, updateAdminCategory, type AdminCategory } from '../../api/admin';
import { fieldErrorsFromIssues } from '../../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const textareaClass =
  'w-full rounded-lg border border-line bg-white p-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'mb-1 block text-sm font-semibold text-ink';
const errorClass = 'mt-1 text-sm font-medium text-red-600';

interface CategoryFormModalProps {
  category?: AdminCategory;
  categories: AdminCategory[];
  onClose: () => void;
  onSaved: (category: AdminCategory, mode: 'create' | 'edit') => void;
}

export function CategoryFormModal({
  category,
  categories,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const isEdit = category !== undefined;

  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [parentId, setParentId] = useState(category?.parentId ?? '');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parentOptions = categories.filter((option) => option.id !== category?.id);

  const handleApiError = (code: string, message: string) => {
    if (code === 'CATEGORY_NAME_EXISTS') {
      setFieldErrors({ name: message });
      return;
    }
    if (code === 'VALIDATION_ERROR') {
      const lower = message.toLowerCase();
      if (lower.includes('parent') || lower.includes('circular')) {
        setFieldErrors({ parentId: message });
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
      name,
      description: description.trim() === '' ? null : description,
      parentId: parentId === '' ? null : parentId,
    };

    if (isEdit) {
      const parsed = categoryUpdateSchema.safeParse(base);
      if (!parsed.success) {
        setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
        return;
      }

      setSubmitting(true);
      const response = await updateAdminCategory(category.id, parsed.data);
      setSubmitting(false);

      if (!response.success) {
        handleApiError(response.error.code, response.error.message);
        return;
      }

      onSaved(response.data.category, 'edit');
      return;
    }

    const parsed = categoryCreateSchema.safeParse(base);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }

    setSubmitting(true);
    const response = await createAdminCategory(parsed.data);
    setSubmitting(false);

    if (!response.success) {
      handleApiError(response.error.code, response.error.message);
      return;
    }

    onSaved(response.data.category, 'create');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-form-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="category-form-title" className="font-serif text-lg font-bold text-ink">
            {isEdit ? 'Edit category' : 'Create category'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close category form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="category-name" className={labelClass}>
              Name
            </label>
            <input
              id="category-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={CATEGORY_NAME_MAX}
              data-testid="category-form-name"
              className={inputClass}
            />
            {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="category-description" className={labelClass}>
              Description
            </label>
            <textarea
              id="category-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              maxLength={CATEGORY_DESCRIPTION_MAX}
              data-testid="category-form-description"
              className={textareaClass}
            />
            {fieldErrors.description && (
              <p className={errorClass}>{fieldErrors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="category-parent" className={labelClass}>
              Parent category
            </label>
            <select
              id="category-parent"
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
              data-testid="category-form-parent"
              className={inputClass}
            >
              <option value="">No parent (top level)</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                  {option.isActive ? '' : ' (inactive)'}
                </option>
              ))}
            </select>
            {fieldErrors.parentId && <p className={errorClass}>{fieldErrors.parentId}</p>}
          </div>

          {generalError && (
            <div
              role="alert"
              data-testid="category-form-error"
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
            <Button type="submit" disabled={submitting} data-testid="category-form-submit">
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save changes'
                  : 'Create category'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
