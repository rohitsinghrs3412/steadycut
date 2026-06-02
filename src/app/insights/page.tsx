import { InsightsSectionPage } from "@/components/steadycut/sections/insights-section";
import { getAppRouteContext } from "@/lib/app-route";

export default async function InsightsPage() {
  const context = await getAppRouteContext();

  return <InsightsSectionPage {...context} />;
}
