import { useEffect, useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import {
  QUESTION_ATTACHMENT_EXTENSIONS,
  QUESTION_ATTACHMENT_MAX_BYTES,
  QUESTION_ATTACHMENTS_MAX,
} from '@structured-qa/shared';
import { uploadAttachment } from '../../api/attachments';
import { formatFileSize } from '../../lib/fileSize';

type AttachmentStatus = 'uploading' | 'done' | 'error';

interface PendingAttachment {
  key: string;
  name: string;
  size: number;
  status: AttachmentStatus;
  id?: string;
  error?: string;
}

interface Props {
  onChange: (ids: string[], uploading: boolean) => void;
  disabled?: boolean;
}

const accept = QUESTION_ATTACHMENT_EXTENSIONS.join(',');
const allowedTypes = QUESTION_ATTACHMENT_EXTENSIONS.join(', ');

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot).toLowerCase();
}

function validateFile(file: File): string | null {
  if (!(QUESTION_ATTACHMENT_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
    return `Allowed types: ${allowedTypes}.`;
  }
  if (file.size > QUESTION_ATTACHMENT_MAX_BYTES) {
    return 'Each file must be 10 MB or smaller.';
  }
  if (file.size === 0) {
    return 'File is empty.';
  }
  return null;
}

export function AttachmentPicker({ onChange, disabled = false }: Props) {
  const [items, setItems] = useState<PendingAttachment[]>([]);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const nextKey = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current(
      items.filter((item) => item.status === 'done' && item.id).map((item) => item.id as string),
      items.some((item) => item.status === 'uploading'),
    );
  }, [items]);

  const upload = async (key: string, file: File) => {
    const response = await uploadAttachment(file);
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        if (response.success) {
          return { ...item, status: 'done', id: response.data.id, error: undefined };
        }
        return { ...item, status: 'error', error: response.error.message };
      }),
    );
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selected.length === 0) return;

    const remaining = QUESTION_ATTACHMENTS_MAX - items.length;
    if (remaining <= 0) {
      setPickerError(`You can attach up to ${QUESTION_ATTACHMENTS_MAX} files.`);
      return;
    }

    const accepted = selected.slice(0, remaining);
    setPickerError(
      selected.length > remaining
        ? `You can attach up to ${QUESTION_ATTACHMENTS_MAX} files.`
        : null,
    );

    const pending = accepted.map((file) => {
      const error = validateFile(file);
      const item: PendingAttachment = {
        key: String(nextKey.current++),
        name: file.name,
        size: file.size,
        status: error ? 'error' : 'uploading',
        error: error ?? undefined,
      };
      if (!error) void upload(item.key, file);
      return item;
    });

    setItems((prev) => [...prev, ...pending]);
  };

  const remove = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
    if (items.length <= QUESTION_ATTACHMENTS_MAX) setPickerError(null);
  };

  const atLimit = items.length >= QUESTION_ATTACHMENTS_MAX;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">Attachments</span>
        <span className="text-xs text-muted">
          {items.length}/{QUESTION_ATTACHMENTS_MAX}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Up to {QUESTION_ATTACHMENTS_MAX} files, 10 MB each. Allowed types: {allowedTypes}.
      </p>

      <label
        className={`mt-3 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-medium text-secondary ${
          disabled || atLimit ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-tint'
        }`}
      >
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        Choose files
        <input
          type="file"
          multiple
          accept={accept}
          onChange={handleFiles}
          disabled={disabled || atLimit}
          className="sr-only"
          data-testid="attachment-input"
        />
      </label>

      {pickerError && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600" data-testid="attachment-error">
          {pickerError}
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Selected attachments">
          {items.map((item) => (
            <li
              key={item.key}
              className="flex items-start justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2"
              data-testid="attachment-item"
            >
              <div className="min-w-0">
                <p className="break-all text-sm font-medium text-ink">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted">{formatFileSize(item.size)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {item.status === 'uploading' && (
                  <span className="text-xs text-muted" data-testid="attachment-uploading">
                    Uploading…
                  </span>
                )}
                {item.status === 'done' && (
                  <span className="text-xs font-medium text-green-700" data-testid="attachment-done">
                    Uploaded
                  </span>
                )}
                {item.status === 'error' && (
                  <span
                    className="max-w-[220px] text-right text-xs font-medium text-red-600"
                    data-testid="attachment-item-error"
                  >
                    {item.error}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.key)}
                  className="rounded p-1 text-muted hover:bg-tint hover:text-ink"
                  aria-label={`Remove attachment ${item.name}`}
                  data-testid="attachment-remove"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
