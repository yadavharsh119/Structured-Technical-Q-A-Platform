import { useState } from 'react';
import { AlertCircle, Archive, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { archiveTopic } from '../../api/topics';
import type { Topic } from '../../api/types';

interface TopicArchiveDialogProps {
  topic: Topic;
  onClose: () => void;
  onArchived: (topic: Topic) => void;
}

export function TopicArchiveDialog({ topic, onClose, onArchived }: TopicArchiveDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setSubmitting(true);
    const response = await archiveTopic(topic.id);
    setSubmitting(false);

    if (!response.success) {
      setError(response.error.message);
      return;
    }

    onArchived(response.data.topic);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="topic-archive-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <Archive className="h-5 w-5 text-amber-700" aria-hidden="true" />
            <h2 id="topic-archive-title" className="font-serif text-lg font-bold">
              Archive topic
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close archive dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-body">
          Archive <span className="font-semibold text-ink">{topic.title}</span>? It will be removed
          from topic lists and search. Existing perspectives stay readable, but no new perspectives
          can be submitted. This cannot be undone.
        </p>

        {error && (
          <div
            role="alert"
            data-testid="topic-archive-error"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            data-testid="topic-archive-confirm"
            className="bg-amber-700 hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Archiving...' : 'Archive topic'}
          </Button>
        </div>
      </div>
    </div>
  );
}
