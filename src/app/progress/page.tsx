import { ProgressSectionPage } from "@/components/steadycut/section-pages";
import { getAppRouteContext } from "@/lib/app-route";

export default async function ProgressPage() {
  const context = await getAppRouteContext();

  return <ProgressSectionPage {...context} />;
}
