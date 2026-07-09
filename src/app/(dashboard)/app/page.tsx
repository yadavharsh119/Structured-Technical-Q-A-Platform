import { OverviewScreen } from "@/features/dashboard/components/overview-screen";
import { getDashboardOverview } from "@/lib/mock-data/dashboard";

export default async function DashboardPage() {
  const data = await getDashboardOverview();

  return <OverviewScreen {...data} />;
}
