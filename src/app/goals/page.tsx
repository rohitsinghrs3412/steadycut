import { GoalsSectionPage } from "@/components/steadycut/section-pages";
import { getAppRouteContext } from "@/lib/app-route";

export default async function GoalsPage() {
  const context = await getAppRouteContext();

  return <GoalsSectionPage {...context} />;
}
