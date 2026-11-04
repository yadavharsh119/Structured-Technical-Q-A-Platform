import { useEffect, useState } from 'react';
import { AlertCircle, ScrollText } from 'lucide-react';
import { listAuditLogs, type AuditLog } from '../../api/admin';
import { Button } from '../ui/Button';
import { Pagination } from '../search/Pagination';

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';
const controlClass =
  'h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink';

const KNOWN_AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.register',
  'admin.user_warn',
  'admin.user_suspend',
  'admin.user_ban',
  'admin.user_restore',
  'admin.user_role_changed',
];

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTarget(log: AuditLog): string {
  if (log.targetType && log.targetId) return `${log.targetType}: ${log.targetId}`;
  return log.targetType ?? log.targetId ?? '—';
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [actor, setActor] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listAuditLogs({
      actor: actor.trim() || undefined,
      action: actionFilter.trim() || undefined,
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
      page,
    }).then((response) => {
      if (cancelled) return;

      if (response.success) {
        setLogs(response.data.logs);
        setTotal(response.data.total);
        setPerPage(response.data.perPage);
      } else {
        setLogs([]);
        setTotal(0);
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [actor, actionFilter, from, to, page, reloadToken]);

  const filtersActive =
    actor.trim() !== '' || actionFilter.trim() !== '' || from !== '' || to !== '';

  const clearFilters = () => {
    setActor('');
    setActionFilter('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="audit-actor-filter" className="text-sm font-medium text-muted">
            Actor
          </label>
          <input
            id="audit-actor-filter"
            type="search"
            value={actor}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(1);
            }}
            placeholder="Username or user ID"
            data-testid="audit-actor-filter"
            className="h-11 w-52 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="audit-action-filter" className="text-sm font-medium text-muted">
            Action
          </label>
          <input
            id="audit-action-filter"
            type="search"
            list="audit-action-options"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. auth.login"
            data-testid="audit-action-filter"
            className="h-11 w-52 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
          />
          <datalist id="audit-action-options">
            {KNOWN_AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action} />
            ))}
          </datalist>
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
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
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
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
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

      <div id="admin-audit-top" className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-base text-body">
          <span className="font-semibold text-ink">{total} log entries</span>
        </p>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted">Audit logs are read-only.</p>
          <button
            type="button"
            onClick={() => setReloadToken((value) => value + 1)}
            className="text-sm font-medium text-secondary underline hover:text-black"
          >
            Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-line bg-white p-12 text-center text-sm text-muted">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <ScrollText className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
          <h3 className="mt-4 font-serif text-xl font-semibold text-ink">No log entries found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            No audit entries match the selected actor, action type or date range.
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
                <th scope="col" className={thClass}>
                  Timestamp
                </th>
                <th scope="col" className={thClass}>
                  Actor
                </th>
                <th scope="col" className={thClass}>
                  Action
                </th>
                <th scope="col" className={thClass}>
                  Target
                </th>
                <th scope="col" className={thClass}>
                  IP Address
                </th>
                <th scope="col" className={thClass}>
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-tint/20">
                  <td className={`${tdClass} whitespace-nowrap text-muted`}>
                    <time dateTime={log.timestamp}>{formatTimestamp(log.timestamp)}</time>
                  </td>
                  <td className={`${tdClass} font-medium text-ink`}>
                    {log.actorUsername ? `@${log.actorUsername}` : 'System'}
                  </td>
                  <td className={tdClass}>{log.action}</td>
                  <td className={`${tdClass} max-w-md break-all`}>{formatTarget(log)}</td>
                  <td className={`${tdClass} whitespace-nowrap font-mono text-xs`}>
                    {log.ip ?? '—'}
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        log.result === 'success'
                          ? 'bg-green-50 text-green-800 border-green-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {log.result === 'success' ? 'Success' : 'Failure'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={perPage}
        onPage={setPage}
        scrollToId="admin-audit-top"
      />
    </div>
  );
}
