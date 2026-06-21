import { CheckInsSectionPage } from "@/components/steadycut/sections/check-ins";
import { getAppRouteContext } from "@/lib/app-route";

export default async function CheckInsPage() {
  const context = await getAppRouteContext();

  return <CheckInsSectionPage {...context} />;
}
