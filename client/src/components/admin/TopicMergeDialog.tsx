import { useState } from 'react';
import { AlertCircle, GitMerge, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { mergeTopics, type TopicMergeResult } from '../../api/topics';
import type { Topic } from '../../api/types';

interface TopicMergeDialogProps {
  source: Topic;
  topics: Topic[];
  onClose: () => void;
  onMerged: (result: TopicMergeResult) => void;
}

export function TopicMergeDialog({
  source,
  topics,
  onClose,
  onMerged,
}: TopicMergeDialogProps) {
  const [destinationId, setDestinationId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  const destinations = topics.filter(
    (topic) => topic.id !== source.id && topic.status !== 'archived',
  );

  const handleConfirm = async () => {
    if (!destinationId) {
      setError({ message: 'Choose a destination topic.', code: 'VALIDATION_ERROR' });
      return;
    }

    setError(null);
    setSubmitting(true);
    const response = await mergeTopics(source.id, destinationId);
    setSubmitting(false);

    if (!response.success) {
      setError({ message: response.error.message, code: response.error.code });
      return;
    }

    onMerged(response.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="topic-merge-title"
        className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 text-ink">
            <GitMerge className="h-5 w-5 text-red-700" aria-hidden="true" />
            <h2 id="topic-merge-title" className="font-serif text-lg font-bold">
              Merge topic
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
            aria-label="Close merge dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-body">
          Merge <span className="font-semibold text-ink">{source.title}</span> into another topic.
          Perspectives and linked questions move to the destination, and the source is archived.
        </p>

        <div className="mt-4">
          <label htmlFor="topic-merge-destination" className="mb-1 block text-sm font-semibold text-ink">
            Destination topic
          </label>
          <select
            id="topic-merge-destination"
            value={destinationId}
            onChange={(event) => {
              setDestinationId(event.target.value);
              setError(null);
            }}
            data-testid="topic-merge-destination"
            className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink"
          >
            <option value="">Select a destination topic</option>
            {destinations.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          {destinations.length === 0 && (
            <p className="mt-1 text-xs text-muted">No other active topics are available.</p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            data-testid="topic-merge-error"
            className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                {error.code === 'TOPIC_MERGE_CONFLICT'
                  ? 'Merge conflict (409)'
                  : 'Merge failed'}
              </p>
              <p className="mt-1">{error.message}</p>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3 border-t border-line pt-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || destinations.length === 0}
            data-testid="topic-merge-confirm"
            className="bg-red-700 hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Merging...' : 'Confirm merge'}
          </Button>
        </div>
      </div>
    </div>
  );
}
