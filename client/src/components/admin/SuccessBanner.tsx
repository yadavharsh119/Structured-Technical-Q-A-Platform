import { CheckCircle2, X } from 'lucide-react';

interface Props {
  message: string;
  onDismiss: () => void;
}

export function SuccessBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900 shadow-xs">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-green-700 hover:bg-green-100"
        aria-label="Dismiss message"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
