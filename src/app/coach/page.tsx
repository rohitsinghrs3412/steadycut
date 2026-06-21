import { CoachSectionPage } from "@/components/steadycut/sections/coach";
import { getAppRouteContext } from "@/lib/app-route";

export default async function CoachPage() {
  const context = await getAppRouteContext();

  return <CoachSectionPage {...context} />;
}
