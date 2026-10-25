import { Archive } from 'lucide-react';

export function ArchivedNotice() {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-line bg-tint p-4 text-sm text-secondary">
      <Archive className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      This Topic is archived. You can read it, but it no longer accepts new Perspectives.
    </p>
  );
}
