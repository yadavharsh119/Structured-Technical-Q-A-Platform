import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { DashboardTopbar } from "@/components/layout/dashboard-topbar";
import { getDashboardOverview } from "@/lib/mock-data/dashboard";
import { dashboardNavItems } from "@/lib/mock-data/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getDashboardOverview();

  return (
    <div className="flex min-h-screen bg-transparent">
      <DashboardSidebar items={dashboardNavItems} />
      <div className="flex min-h-screen flex-1 flex-col">
        <DashboardTopbar profile={profile} />
        <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
