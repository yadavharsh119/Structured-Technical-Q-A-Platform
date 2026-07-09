import type {
  ActivityItem,
  InsightCardData,
  MetricCardData,
  UserProfile,
} from "@/lib/types";

const profile: UserProfile = {
  name: "Ari Mercer",
  email: "ari@osmion.ai",
  role: "Admin",
  team: "Applied Intelligence",
  timezone: "Asia/Kolkata",
};

const metrics: MetricCardData[] = [
  {
    id: "active-models",
    label: "Active model graphs",
    value: 18,
    delta: "+12% this week",
    detail:
      "Cross-domain representations are stabilizing faster after the last calibration pass.",
  },
  {
    id: "signal-streams",
    label: "Signal streams monitored",
    value: 2640,
    delta: "+320 new streams",
    detail:
      "Typed ingestion lanes are ready for a future backend connector layer.",
  },
  {
    id: "alignment-score",
    label: "Alignment confidence",
    value: 94,
    delta: "+4 points",
    detail:
      "Human-state predictions improved after narrative trace enrichment.",
  },
];

const activity: ActivityItem[] = [
  {
    id: "1",
    title: "Baseline persona map refreshed",
    description:
      "Updated internal archetype embeddings and merged signal drift notes.",
    timestamp: "4 minutes ago",
    tone: "positive",
  },
  {
    id: "2",
    title: "Observation lane awaiting source hookup",
    description:
      "Frontend contract is ready; backend ingestion can attach to the typed seam later.",
    timestamp: "19 minutes ago",
    tone: "attention",
  },
  {
    id: "3",
    title: "Workspace review completed",
    description:
      "Layout, navigation, and preference model all passed the internal readiness checklist.",
    timestamp: "1 hour ago",
    tone: "neutral",
  },
];

const insights: InsightCardData[] = [
  {
    id: "insight-1",
    eyebrow: "Signal health",
    title: "The platform shell is ready for live system inputs.",
    body:
      "Typed mock boundaries mirror future async fetch points so production data can replace local seams cleanly.",
  },
  {
    id: "insight-2",
    eyebrow: "Operator focus",
    title: "Keep analysts in context, not in menus.",
    body:
      "The first dashboard pass prioritizes glanceable metrics, recent activity, and fast movement into settings and future modules.",
  },
];

export async function getDashboardOverview() {
  return {
    profile,
    metrics,
    activity,
    insights,
  };
}
