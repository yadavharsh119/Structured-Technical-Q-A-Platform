import type { NavItem } from "@/lib/types";

export const marketingNavItems: NavItem[] = [
  { href: "#platform", label: "Platform", status: "ready" },
  { href: "#architecture", label: "Architecture", status: "ready" },
  { href: "#signals", label: "Signals", status: "ready" },
];

export const dashboardNavItems: NavItem[] = [
  {
    href: "/app",
    label: "Overview",
    description: "Mission control",
    status: "ready",
  },
  {
    href: "/app/settings",
    label: "Settings",
    description: "Identity and preferences",
    status: "ready",
  },
  {
    href: "/app/models",
    label: "Models",
    description: "Coming soon",
    status: "upcoming",
  },
  {
    href: "/app/workflows",
    label: "Workflows",
    description: "Coming soon",
    status: "upcoming",
  },
];
