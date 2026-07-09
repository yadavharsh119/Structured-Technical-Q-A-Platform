import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardLoading() {
  return (
    <div className="px-5 py-8 sm:px-8">
      <LoadingState
        title="Loading dashboard"
        description="Preparing metrics, activity, and operator context."
      />
    </div>
  );
}
