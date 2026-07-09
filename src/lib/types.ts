export interface NavItem {
  href: string;
  label: string;
  description?: string;
  status: "ready" | "upcoming";
}

export interface MetricCardData {
  id: string;
  label: string;
  value: number;
  delta: string;
  detail: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: "neutral" | "positive" | "attention";
}

export interface UserProfile {
  name: string;
  email: string;
  role: "Admin" | "Member";
  team: string;
  timezone: string;
}

export interface SettingsField {
  id: string;
  label: string;
  value: string;
  hint: string;
  type?: "text" | "email";
  placeholder?: string;
}

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  fields: SettingsField[];
}

export interface InsightCardData {
  id: string;
  title: string;
  body: string;
  eyebrow: string;
}
