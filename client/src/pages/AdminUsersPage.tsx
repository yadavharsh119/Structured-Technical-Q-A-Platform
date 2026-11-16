import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { UserManagementTab } from '../components/admin/UserManagementTab';

export function AdminUsersPage() {
  return (
    <PageShell>
      <section aria-labelledby="admin-users-heading" className="border-b border-line bg-white">
        <div className="mx-auto max-w-content px-6 py-10 md:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Admin
                </span>
                <span className="text-xs text-muted">Platform Management</span>
              </div>
              <h1
                id="admin-users-heading"
                className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
              >
                User Management
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-body">
                Search users, review account status, and apply moderation actions. Every action
                requires a reason and is recorded in the audit log.
              </p>
            </div>
            <Link
              to="/admin/audit-logs"
              className="text-sm font-semibold text-ink underline hover:text-black"
            >
              View audit logs
            </Link>
          </div>
        </div>
      </section>

      <section className="min-h-[500px] bg-canvas">
        <div className="mx-auto max-w-content px-6 py-8">
          <UserManagementTab />
        </div>
      </section>
    </PageShell>
  );
}

export default AdminUsersPage;
