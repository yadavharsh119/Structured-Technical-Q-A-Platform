import { useEffect, useState } from 'react';
import { AlertCircle, Users, X } from 'lucide-react';
import {
  ADMIN_ASSIGNABLE_ROLES,
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
} from '@structured-qa/shared';
import {
  applyAdminUserAction,
  listAdminUsers,
  updateAdminUserRole,
  type AdminAssignableRole,
  type AdminRole,
  type AdminUser,
  type AdminUserAction,
  type AdminUserStatus,
} from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Pagination } from '../search/Pagination';
import { SuccessBanner } from './SuccessBanner';

type UserAction = 'role' | AdminUserAction;

const ACTION_LABEL: Record<UserAction, string> = {
  role: 'Change Role',
  warn: 'Warn',
  suspend: 'Suspend',
  ban: 'Ban',
  restore: 'Restore',
};

const ROLE_LABEL: Record<AdminRole, string> = {
  registered: 'Registered',
  moderator: 'Moderator',
  admin: 'Admin',
};

const STATUS_LABEL: Record<AdminUserStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
  deactivated: 'Deactivated',
};

const STATUS_BADGE: Record<AdminUserStatus, string> = {
  active: 'bg-green-50 text-green-800 border-green-200',
  suspended: 'bg-amber-50 text-amber-800 border-amber-200',
  banned: 'bg-red-50 text-red-800 border-red-200',
  deactivated: 'bg-gray-50 text-gray-700 border-gray-200',
};

const thClass =
  'border-b border-line bg-tint/60 p-4 text-left text-xs font-semibold uppercase tracking-wider text-muted';
const tdClass = 'border-b border-line p-4 text-sm text-body align-top';
const controlClass =
  'h-11 rounded-lg border border-line bg-white px-3 text-sm font-medium text-ink';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function availableActions(user: AdminUser, currentUserId: string | undefined): UserAction[] {
  if (user.role === 'admin' || user.id === currentUserId) return [];

  const actions: UserAction[] = ['role', 'warn'];
  if (user.status === 'active') actions.push('suspend');
  if (user.status !== 'banned') actions.push('ban');
  if (user.status !== 'active') actions.push('restore');
  return actions;
}

function actionLabel(action: UserAction): string {
  return ACTION_LABEL[action];
}

function actionPhrase(
  target: AdminUser,
  action: UserAction,
  nextRole: AdminAssignableRole,
): string {
  switch (action) {
    case 'role':
      return `change @${target.username}'s role to ${ROLE_LABEL[nextRole]}`;
    case 'warn':
      return `issue a warning to @${target.username}`;
    case 'suspend':
      return `suspend @${target.username}`;
    case 'ban':
      return `ban @${target.username}`;
    case 'restore':
      return `restore @${target.username} to Active`;
  }
}

export function UserManagementTab() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(20);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AdminRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AdminUserStatus>('all');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [action, setAction] = useState<UserAction | null>(null);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [duration, setDuration] = useState('7');
  const [nextRole, setNextRole] = useState<AdminAssignableRole>('moderator');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [banner, setBanner] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    listAdminUsers({
      q: query.trim() || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      page,
    }).then((response) => {
      if (cancelled) return;

      if (response.success) {
        setUsers(response.data.users);
        setTotal(response.data.total);
        setPerPage(response.data.perPage);
      } else {
        setUsers([]);
        setTotal(0);
        setLoadError(response.error.message);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [query, roleFilter, statusFilter, page, reloadToken]);

  const filtersActive = query.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all';

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const openAction = (user: AdminUser, next: UserAction) => {
    setTarget(user);
    setAction(next);
    setReason('');
    setReasonError('');
    setConfirmed(false);
    setDuration('7');
    setNextRole(user.role === 'moderator' ? 'registered' : 'moderator');
    setActionError(null);
  };

  const closeModal = () => {
    setAction(null);
    setTarget(null);
    setReason('');
    setReasonError('');
    setConfirmed(false);
    setActionError(null);
  };

  const handleSubmit = async () => {
    if (!target || !action) return;

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError('A reason is required.');
      return;
    }

    const durationDays = Number(duration);
    if (
      action === 'suspend' &&
      (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)
    ) {
      setActionError('Suspension duration must be a whole number of days between 1 and 3650.');
      return;
    }

    if (!confirmed) {
      setConfirmed(true);
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const response =
      action === 'role'
        ? await updateAdminUserRole(target.id, nextRole)
        : await applyAdminUserAction(target.id, {
            action,
            reason: trimmedReason,
            ...(action === 'suspend' ? { durationDays } : {}),
          });

    setSubmitting(false);

    if (!response.success) {
      setActionError(response.error.message);
      return;
    }

    const updated = response.data.user;
    setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
    setBanner(
      `@${target.username}: ${actionPhrase(target, action, nextRole)}. Reason: "${trimmedReason}"`,
    );
    closeModal();
  };

  return (
    <div className="space-y-6">
      {banner && <SuccessBanner message={banner} onDismiss={() => setBanner(null)} />}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="user-search" className="text-sm font-medium text-muted">
            Search
          </label>
          <input
            id="user-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Name, username or email"
            data-testid="admin-user-search"
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
            onChange={(e) => {
              setRoleFilter(e.target.value as 'all' | AdminRole);
              setPage(1);
            }}
            data-testid="admin-user-role-filter"
            className={controlClass}
          >
            <option value="all">All roles</option>
            {ADMIN_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
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
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | AdminUserStatus);
              setPage(1);
            }}
            data-testid="admin-user-status-filter"
            className={controlClass}
          >
            <option value="all">All statuses</option>
            {ADMIN_USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
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

      <div id="admin-users-top" className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-base text-body">
          <span className="font-semibold text-ink">{total} users</span>
        </p>
        <button
          type="button"
          onClick={() => setReloadToken((value) => value + 1)}
          className="text-sm font-medium text-secondary underline hover:text-black"
        >
          Refresh
        </button>
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
          Loading users...
        </div>
      ) : users.length === 0 ? (
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
                <th scope="col" className={thClass}>
                  Name
                </th>
                <th scope="col" className={thClass}>
                  Username
                </th>
                <th scope="col" className={thClass}>
                  Email
                </th>
                <th scope="col" className={thClass}>
                  Role
                </th>
                <th scope="col" className={thClass}>
                  Status
                </th>
                <th scope="col" className={thClass}>
                  Joined
                </th>
                <th scope="col" className={thClass}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-tint/20">
                  <td className={`${tdClass} font-medium text-ink`}>{user.fullName}</td>
                  <td className={tdClass}>@{user.username}</td>
                  <td className={tdClass}>{user.email}</td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${
                        user.role === 'admin'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : user.role === 'moderator'
                            ? 'border-line bg-tint text-ink'
                            : 'border-line bg-white text-secondary'
                      }`}
                    >
                      {ROLE_LABEL[user.role]}
                    </span>
                  </td>
                  <td className={tdClass}>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[user.status]}`}
                    >
                      {STATUS_LABEL[user.status]}
                    </span>
                    {user.status === 'suspended' && user.suspendedUntil && (
                      <p className="mt-1 text-xs text-muted">
                        until {formatDate(user.suspendedUntil)}
                      </p>
                    )}
                  </td>
                  <td className={tdClass}>{formatDate(user.createdAt)}</td>
                  <td className={tdClass}>
                    {availableActions(user, currentUser?.id).length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <select
                        aria-label={`Actions for ${user.username}`}
                        value=""
                        onChange={(e) => {
                          const next = e.target.value as UserAction;
                          if (next) openAction(user, next);
                        }}
                        className="h-9 rounded-lg border border-line bg-white px-2 text-xs font-medium text-ink"
                      >
                        <option value="">Actions…</option>
                        {availableActions(user, currentUser?.id).map((actionOption) => (
                          <option key={actionOption} value={actionOption}>
                            {actionLabel(actionOption)}
                          </option>
                        ))}
                      </select>
                    )}
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
        scrollToId="admin-users-top"
      />

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
                {actionLabel(action)}
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
                  {target.fullName}{' '}
                  <span className="font-normal text-muted">(@{target.username})</span>
                </p>
              </div>

              {action === 'role' && (
                <div>
                  <label
                    htmlFor="action-role"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    New role
                  </label>
                  <select
                    id="action-role"
                    value={nextRole}
                    onChange={(e) => {
                      setNextRole(e.target.value as AdminAssignableRole);
                      setConfirmed(false);
                    }}
                    className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    {ADMIN_ASSIGNABLE_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {action === 'suspend' && (
                <div>
                  <label
                    htmlFor="suspend-duration"
                    className="mb-1 block text-xs font-semibold text-ink"
                  >
                    Suspension duration (days)
                  </label>
                  <input
                    id="suspend-duration"
                    type="number"
                    min={1}
                    max={3650}
                    value={duration}
                    onChange={(e) => {
                      setDuration(e.target.value);
                      setConfirmed(false);
                    }}
                    className="w-full rounded-lg border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}

              <div>
                <label
                  htmlFor="action-reason"
                  className="mb-1 block text-xs font-semibold text-ink"
                >
                  Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  id="action-reason"
                  rows={4}
                  value={reason}
                  maxLength={2000}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError('');
                    setActionError(null);
                    setConfirmed(false);
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

              {actionError && (
                <p
                  role="alert"
                  className="flex items-center gap-1 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-700"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" /> {actionError}
                </p>
              )}

              {confirmed && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
                  <span>
                    Are you sure you want to {actionPhrase(target, action, nextRole)}
                    {action === 'suspend' ? ` for ${duration} days` : ''}? This action will be
                    recorded in the audit log.
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
                disabled={submitting}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  action === 'ban' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-secondary'
                }`}
              >
                {submitting ? 'Saving...' : confirmed ? 'Confirm' : actionLabel(action)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
