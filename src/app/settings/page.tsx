import { SettingsSectionPage } from "@/components/steadycut/section-pages";
import { getAppRouteContext } from "@/lib/app-route";

export default async function SettingsPage() {
  const context = await getAppRouteContext();

  return <SettingsSectionPage {...context} />;
}
