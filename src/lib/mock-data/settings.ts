import type { SettingsSection, UserProfile } from "@/lib/types";

const profile: UserProfile = {
  name: "Ari Mercer",
  email: "ari@osmion.ai",
  role: "Admin",
  team: "Applied Intelligence",
  timezone: "Asia/Kolkata",
};

const sections: SettingsSection[] = [
  {
    id: "identity",
    title: "Identity",
    description:
      "Operator details surfaced across activity, ownership, and collaboration contexts.",
    fields: [
      {
        id: "name",
        label: "Display name",
        value: "Ari Mercer",
        hint: "Shown to collaborators and on audit surfaces.",
      },
      {
        id: "email",
        label: "Work email",
        value: "ari@osmion.ai",
        hint: "This will become the primary authentication identifier later.",
        type: "email",
      },
    ],
  },
  {
    id: "workspace",
    title: "Workspace defaults",
    description:
      "Preferences that influence how models, insights, and notifications appear.",
    fields: [
      {
        id: "team",
        label: "Team",
        value: "Applied Intelligence",
        hint: "Used for scoped navigation and future member routing.",
      },
      {
        id: "timezone",
        label: "Timezone",
        value: "Asia/Kolkata",
        hint: "Controls timestamps and scheduled task visibility.",
      },
    ],
  },
];

export async function getSettingsPayload(): Promise<{
  profile: UserProfile;
  sections: SettingsSection[];
}> {
  return {
    profile,
    sections,
  };
}
