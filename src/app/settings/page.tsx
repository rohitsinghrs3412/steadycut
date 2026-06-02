import { SettingsSectionPage } from "@/components/steadycut/sections/settings-section";
import { getAppRouteContext } from "@/lib/app-route";

export default async function SettingsPage() {
  const context = await getAppRouteContext();

  return <SettingsSectionPage {...context} />;
}
