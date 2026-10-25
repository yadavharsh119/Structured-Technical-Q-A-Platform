import { useMemo, useState, type ReactNode } from 'react';
import { BarChart3, FileQuestion, FileText, Flag, MessageSquare, Users } from 'lucide-react';
import { PageShell } from '../components/layout/PageShell';
import { AuditLogsTab } from '../components/admin/AuditLogsTab';
import { SystemSettingsTab } from '../components/admin/SystemSettingsTab';
import { UserManagementTab } from '../components/admin/UserManagementTab';
import { INITIAL_ADMIN_USERS, NEW_USERS_PER_WEEK } from '../data/mockAdmin';
import { INITIAL_PENDING_QUESTIONS } from '../data/mockQuestions';
import { INITIAL_REPORTS } from '../data/mockReports';
import { PERSPECTIVES } from '../data/mockPerspectives';
import { SEARCH_TOPICS } from '../data/mockTopics';

type AdminTab = 'overview' | 'users' | 'settings' | 'audit';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'User Management' },
  { id: 'settings', label: 'System Settings' },
  { id: 'audit', label: 'Audit Logs' },
];

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-tint/30 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-serif font-bold text-ink">{value}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const openReports = useMemo(
    () => INITIAL_REPORTS.filter((r) => r.status === 'Open').length,
    [],
  );
  const maxNewUsers = useMemo(
    () => Math.max(...NEW_USERS_PER_WEEK.map((p) => p.count)),
    [],
  );

  return (
    <PageShell>
      <div className="pb-28">
        {/* Header */}
        <section aria-labelledby="admin-heading" className="border-b border-line bg-white">
          <div className="mx-auto max-w-content px-6 py-10 md:py-14">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    Admin
                  </span>
                  <span className="text-xs text-muted">Platform Management</span>
                </div>
                <h1
                  id="admin-heading"
                  className="mt-2 font-serif text-[28px] leading-[1.2] text-ink md:text-[36px]"
                >
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-sm text-body">
                  Monitor platform activity, manage user accounts, configure system settings, and
                  review the audit trail.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-tint/40 px-5 py-3 text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Open Reports
                </span>
                <p className="font-serif text-2xl font-bold text-ink">{openReports}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="bg-canvas min-h-[500px]">
          <div className="mx-auto max-w-content px-6 py-8">
            {/* Tabs navigation */}
            <div
              role="tablist"
              aria-label="Admin sections"
              className="flex gap-6 overflow-x-auto border-b border-line"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`admin-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-3 text-sm font-semibold transition-colors border-b-2 -mb-[2px] whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-black text-ink'
                      : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div
                role="tabpanel"
                id="admin-panel-overview"
                aria-labelledby="admin-tab-overview"
                className="pt-8"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <StatCard
                    label="Total Users"
                    value={INITIAL_ADMIN_USERS.length}
                    icon={<Users className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                  <StatCard
                    label="Total Topics"
                    value={SEARCH_TOPICS.length}
                    icon={<FileText className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                  <StatCard
                    label="Total Perspectives"
                    value={PERSPECTIVES.length}
                    icon={<MessageSquare className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                  <StatCard
                    label="Pending Questions"
                    value={INITIAL_PENDING_QUESTIONS.length}
                    icon={<FileQuestion className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                  <StatCard
                    label="Open Reports"
                    value={openReports}
                    icon={<Flag className="h-4 w-4 text-muted" aria-hidden="true" />}
                  />
                </div>

                <div className="mt-6 rounded-xl border border-line bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <BarChart3 className="h-5 w-5 text-ink" aria-hidden="true" />
                    <h2 className="font-serif text-lg font-semibold text-ink">
                      New Users per Week
                    </h2>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    New registrations over the last eight weeks.
                  </p>

                  <div className="mt-6 flex h-52 items-end gap-3">
                    {NEW_USERS_PER_WEEK.map((point) => (
                      <div key={point.week} className="flex h-full flex-1 flex-col gap-2">
                        <span className="text-center text-xs font-semibold text-ink">
                          {point.count}
                        </span>
                        <div className="flex flex-1 items-end">
                          <div
                            className="w-full rounded-t-md bg-black"
                            style={{ height: `${(point.count / maxNewUsers) * 100}%` }}
                            title={`${point.count} new users in the week of ${point.week}`}
                          />
                        </div>
                        <span className="text-center text-xs text-muted">{point.week}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: User Management */}
            {activeTab === 'users' && (
              <div
                role="tabpanel"
                id="admin-panel-users"
                aria-labelledby="admin-tab-users"
                className="pt-8"
              >
                <UserManagementTab />
              </div>
            )}

            {/* Tab 3: System Settings */}
            {activeTab === 'settings' && (
              <div
                role="tabpanel"
                id="admin-panel-settings"
                aria-labelledby="admin-tab-settings"
                className="pt-8"
              >
                <SystemSettingsTab />
              </div>
            )}

            {/* Tab 4: Audit Logs */}
            {activeTab === 'audit' && (
              <div
                role="tabpanel"
                id="admin-panel-audit"
                aria-labelledby="admin-tab-audit"
                className="pt-8"
              >
                <AuditLogsTab />
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export default AdminDashboardPage;
