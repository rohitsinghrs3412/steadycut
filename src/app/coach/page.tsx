import { CoachSectionPage } from "@/components/steadycut/section-pages";
import { getAppRouteContext } from "@/lib/app-route";

export default async function CoachPage() {
  const context = await getAppRouteContext();

  return <CoachSectionPage {...context} />;
}
