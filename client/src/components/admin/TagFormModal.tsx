import { useState, type FormEvent } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { TAG_NAME_MAX, tagCreateSchema, tagUpdateSchema } from '@structured-qa/shared';
import { Button } from '../ui/Button';
import { createAdminTag, updateAdminTag, type AdminTag } from '../../api/admin';
import { fieldErrorsFromIssues } from '../../lib/fieldErrors';

const inputClass =
  'h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';
const labelClass = 'mb-1 block text-sm font-semibold text-ink';
const errorClass = 'mt-1 text-sm font-medium text-red-600';

interface TagFormModalProps {
  tag?: AdminTag;
  onClose: () => void;
  onSaved: (tag: AdminTag, mode: 'create' | 'edit') => void;
}

export function TagFormModal({ tag, onClose, onSaved }: TagFormModalProps) {
  const isEdit = tag !== undefined;

  const [name, setName] = useState(tag?.name ?? '');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleApiError = (code: string, message: string) => {
    if (code === 'TAG_NAME_EXISTS') {
      setFieldErrors({ name: message });
      return;
    }
    setGeneralError(message);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    if (isEdit) {
      const parsed = tagUpdateSchema.safeParse({ name });
      if (!parsed.success) {
        setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
        return;
      }

      setSubmitting(true);
      const response = await updateAdminTag(tag.id, parsed.data);
      setSubmitting(false);

      if (!response.success) {
        handleApiError(response.error.code, response.error.message);
        return;
      }

      onSaved(response.data.tag, 'edit');
      return;
    }

    const parsed = tagCreateSchema.safeParse({ name });
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromIssues(parsed.error.issues));
      return;
    }

    setSubmitting(true);
    const response = await createAdminTag(parsed.data);
    setSubmitting(false);

    if (!response.success) {
      handleApiError(response.error.code, response.error.message);
      return;
    }

    onSaved(response.data.tag, 'create');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tag-form-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h2 id="tag-form-title" className="font-serif text-lg font-bold text-ink">
            {isEdit ? 'Rename tag' : 'Create tag'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close tag form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
          <div>
            <label htmlFor="tag-name" className={labelClass}>
              Name
            </label>
            <input
              id="tag-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={TAG_NAME_MAX}
              data-testid="tag-form-name"
              className={inputClass}
            />
            {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
          </div>

          {generalError && (
            <div
              role="alert"
              data-testid="tag-form-error"
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
            <Button type="submit" disabled={submitting} data-testid="tag-form-submit">
              {submitting
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                  ? 'Save changes'
                  : 'Create tag'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
