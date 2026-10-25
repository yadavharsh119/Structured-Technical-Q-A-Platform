import { useMemo, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Button } from '../ui/Button';
import { AUDIT_ACTIONS, AUDIT_LOGS, type AuditAction } from '../../data/mockAdmin';

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';
const controlClass = 'h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink';

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AuditLogsTab() {
  const [actionFilter, setActionFilter] = useState<'All' | AuditAction>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const filtered = useMemo(
    () =>
      AUDIT_LOGS.filter((entry) => {
        const day = entry.timestamp.slice(0, 10);
        return (
          (actionFilter === 'All' || entry.action === actionFilter) &&
          (!from || day >= from) &&
          (!to || day <= to)
        );
      }),
    [actionFilter, from, to],
  );

  const filtersActive = actionFilter !== 'All' || from !== '' || to !== '';

  const clearFilters = () => {
    setActionFilter('All');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="audit-action-filter" className="text-sm font-medium text-muted">
            Action
          </label>
          <select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as 'All' | AuditAction)}
            className={controlClass}
          >
            <option value="All">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="audit-from" className="text-sm font-medium text-muted">
            From
          </label>
          <input
            id="audit-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className={controlClass}
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="audit-to" className="text-sm font-medium text-muted">
            To
          </label>
          <input
            id="audit-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={controlClass}
          />
        </div>

        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="pb-2.5 text-sm font-medium text-secondary underline hover:text-black"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-base text-body">
          <span className="font-semibold text-ink">{filtered.length} log entries</span>
        </p>
        <p className="text-xs text-muted">Audit logs are read-only.</p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <ScrollText className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
          <h3 className="mt-4 font-serif text-xl font-semibold text-ink">No log entries found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            No audit entries match the selected action type or date range.
          </p>
          {filtersActive && (
            <div className="mt-6">
              <Button variant="outline" onClick={clearFilters} className="py-2 text-xs">
                Clear filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className={thClass}>Timestamp</th>
                <th scope="col" className={thClass}>Actor</th>
                <th scope="col" className={thClass}>Action</th>
                <th scope="col" className={thClass}>Target</th>
                <th scope="col" className={thClass}>IP Address</th>
                <th scope="col" className={thClass}>Result</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-tint/20">
                  <td className={`${tdClass} whitespace-nowrap text-muted`}>
                    <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                  </td>
                  <td className={`${tdClass} font-medium text-ink`}>@{entry.actor}</td>
                  <td className={tdClass}>{entry.action}</td>
                  <td className={`${tdClass} max-w-md`}>{entry.target}</td>
                  <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>{entry.ip}</td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        entry.result === 'Success'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {entry.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
