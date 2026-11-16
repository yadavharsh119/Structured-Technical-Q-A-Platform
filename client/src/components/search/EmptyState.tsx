import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  icon?: ReactNode;
  title?: string;
  text?: string;
  action?: ReactNode;
  onClear?: () => void;
}

export function EmptyState({ icon, title, text, action, onClear }: Props) {
  return (
    <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {icon ?? <Search className="mx-auto h-8 w-8 text-deco" aria-hidden="true" />}
      <h3 className="mt-4 text-lg font-semibold text-ink">{title ?? 'No Topics match your search'}</h3>
      <p className="mx-auto mt-2 max-w-sm text-base text-body">
        {text ?? 'Try a different keyword or clear some filters.'}
      </p>
      {action ?? (
        onClear && (
          <Button onClick={onClear} className="mt-6">
            Clear all filters
          </Button>
        )
      )}
    </div>
  );
}

