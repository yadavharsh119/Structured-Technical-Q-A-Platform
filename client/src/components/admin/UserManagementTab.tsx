import { useMemo, useState } from 'react';
import { AlertCircle, Users, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { SuccessBanner } from './SuccessBanner';
import {
  INITIAL_ADMIN_USERS,
  SUSPEND_DURATIONS,
  USER_ROLES,
  USER_STATUSES,
  type AdminUser,
  type UserAccountStatus,
  type UserRoleName,
} from '../../data/mockAdmin';

type UserAction = 'role' | 'warning' | 'suspend' | 'ban' | 'restore';

const ACTION_LABEL: Record<UserAction, string> = {
  role: 'Change Role',
  warning: 'Issue Warning',
  suspend: 'Suspend User',
  ban: 'Ban User',
  restore: 'Restore User',
};

const STATUS_BADGE: Record<UserAccountStatus, string> = {
  Active: 'bg-green-50 text-green-800 border-green-200',
  Suspended: 'bg-amber-50 text-amber-800 border-amber-200',
  Banned: 'bg-red-50 text-red-800 border-red-200',
};

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';
const controlClass = 'h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink';

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function availableActions(u: AdminUser): UserAction[] {
  const actions: UserAction[] = ['role', 'warning'];
  if (u.status === 'Active') actions.push('suspend');
  if (u.status !== 'Banned') actions.push('ban');
  if (u.status !== 'Active') actions.push('restore');
  return actions;
}

function actionLabel(u: AdminUser, action: UserAction): string {
  if (action === 'role') {
    return `Change role to ${u.role === 'Moderator' ? 'Registered' : 'Moderator'}`;
  }
  return ACTION_LABEL[action];
}

function actionPhrase(u: AdminUser, action: UserAction): string {
  switch (action) {
    case 'role':
      return `change @${u.username}'s role to ${u.role === 'Moderator' ? 'Registered' : 'Moderator'}`;
    case 'warning':
      return `issue a warning to @${u.username}`;
    case 'ban':
      return `ban @${u.username}`;
    case 'restore':
      return `restore @${u.username} to Active`;
    default:
      return `suspend @${u.username}`;
  }
}

export function UserManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_ADMIN_USERS);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | UserRoleName>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | UserAccountStatus>('All');

  const [action, setAction] = useState<UserAction | null>(null);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [duration, setDuration] = useState<string>(SUSPEND_DURATIONS[0]);

  const [banner, setBanner] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        (roleFilter === 'All' || u.role === roleFilter) &&
        (statusFilter === 'All' || u.status === statusFilter) &&
        (!q ||
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)),
    );
  }, [users, query, roleFilter, statusFilter]);

  const filtersActive = query.trim() !== '' || roleFilter !== 'All' || statusFilter !== 'All';

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('All');
    setStatusFilter('All');
  };

  const openAction = (u: AdminUser, next: UserAction) => {
    setTarget(u);
    setAction(next);
    setReason('');
    setReasonError('');
    setConfirmed(false);
    setDuration(SUSPEND_DURATIONS[0]);
  };

  const closeModal = () => {
    setAction(null);
    setTarget(null);
    setConfirmed(false);
  };

  const patchUser = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const handleSubmit = () => {
    if (!target || !action) return;
    if (!reason.trim()) {
      setReasonError('A reason is required.');
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    const why = reason.trim();
    let message = '';

    if (action === 'role') {
      const nextRole: UserRoleName = target.role === 'Moderator' ? 'Registered' : 'Moderator';
      patchUser(target.id, { role: nextRole });
      message = `@${target.username} is now ${nextRole}. Reason: "${why}"`;
    } else if (action === 'warning') {
      message = `Warning issued to @${target.username}. Reason: "${why}"`;
    } else if (action === 'suspend') {
      patchUser(target.id, { status: 'Suspended' });
      message = `@${target.username} suspended for ${duration}. Reason: "${why}"`;
    } else if (action === 'ban') {
      patchUser(target.id, { status: 'Banned' });
      message = `@${target.username} banned. Reason: "${why}"`;
    } else {
      patchUser(target.id, { status: 'Active' });
      message = `@${target.username} restored to Active. Reason: "${why}"`;
    }

    setBanner(message);
    closeModal();
  };

  return (
    <div className="space-y-6">
      {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="user-search" className="text-sm font-medium text-muted">
            Search
          </label>
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, username or email"
            className="h-11 w-64 rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="role-filter" className="text-sm font-medium text-muted">
            Role
          </label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'All' | UserRoleName)}
            className={controlClass}
          >
            <option value="All">All roles</option>
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="user-status-filter" className="text-sm font-medium text-muted">
            Status
          </label>
          <select
            id="user-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | UserAccountStatus)}
            className={controlClass}
          >
            <option value="All">All statuses</option>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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

      <p aria-live="polite" className="text-base text-body">
        <span className="font-semibold text-ink">{filtered.length} users</span>
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-white p-12 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <Users className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
          <h3 className="mt-4 font-serif text-xl font-semibold text-ink">No users found</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            No users match the current search or filters.
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
                <th scope="col" className={thClass}>Name</th>
                <th scope="col" className={thClass}>Username</th>
                <th scope="col" className={thClass}>Email</th>
                <th scope="col" className={thClass}>Role</th>
                <th scope="col" className={thClass}>Status</th>
                <th scope="col" className={thClass}>Joined</th>
                <th scope="col" className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-tint/20">
                  <td className={`${tdClass} font-medium text-ink`}>{u.fullName}</td>
                  <td className={tdClass}>@{u.username}</td>
                  <td className={tdClass}>{u.email}</td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        u.role === 'Moderator'
                          ? 'border-line bg-tint text-ink'
                          : 'border-line bg-white text-secondary'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status]}`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className={tdClass}>{formatDate(u.joinedDate)}</td>
                  <td className={tdClass}>
                    <select
                      aria-label={`Actions for ${u.username}`}
                      value=""
                      onChange={(e) => {
                        const next = e.target.value as UserAction;
                        if (next) openAction(u, next);
                      }}
                      className="h-9 rounded-lg border border-line bg-white px-2 text-xs font-medium text-ink"
                    >
                      <option value="">Actions…</option>
                      {availableActions(u).map((a) => (
                        <option key={a} value={a}>
                          {actionLabel(u, a)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: user action with mandatory reason and confirmation */}
      {action && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-title"
            className="w-full max-w-lg rounded-xl border border-line bg-white p-6 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 id="user-action-title" className="font-serif text-lg font-bold text-ink">
                {actionLabel(target, action)}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-muted hover:bg-tint hover:text-black"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-muted">User:</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {target.fullName} <span className="font-normal text-muted">(@{target.username})</span>
                </p>
              </div>

              {action === 'suspend' && (
                <div>
                  <label
                    htmlFor="suspend-duration"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Suspension duration
                  </label>
                  <select
                    id="suspend-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {SUSPEND_DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="action-reason" className="mb-1 block text-xs font-semibold text-ink">
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="action-reason"
                  rows={4}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (reasonError) setReasonError('');
                  }}
                  placeholder="Explain why this action is being taken..."
                  className="w-full rounded-lg border border-line p-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-black"
                />
                {reasonError && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
                    <AlertCircle className="h-3 w-3" /> {reasonError}
                  </p>
                )}
              </div>

              {confirmed && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Are you sure you want to {actionPhrase(target, action)}
                    {action === 'suspend' ? ` for ${duration}` : ''}? The user will be notified by
                    email.
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-line pt-3">
              <Button variant="outline" onClick={closeModal} className="py-2 text-xs">
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleSubmit}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${
                  action === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-secondary'
                }`}
              >
                {confirmed ? 'Confirm' : actionLabel(target, action)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
