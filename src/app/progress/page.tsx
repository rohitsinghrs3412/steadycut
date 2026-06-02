import { ProgressSectionPage } from "@/components/steadycut/sections/progress-section";
import { getAppRouteContext } from "@/lib/app-route";

export default async function ProgressPage() {
  const context = await getAppRouteContext();

  return <ProgressSectionPage {...context} />;
}
