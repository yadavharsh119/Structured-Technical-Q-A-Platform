import { SettingsScreen } from "@/features/settings/components/settings-screen";
import { getSettingsPayload } from "@/lib/mock-data/settings";

export default async function SettingsPage() {
  const data = await getSettingsPayload();

  return <SettingsScreen {...data} />;
}
