import { GoalsSectionPage } from "@/components/steadycut/sections/goals-section";
import { getAppRouteContext } from "@/lib/app-route";

export default async function GoalsPage() {
  const context = await getAppRouteContext();

  return <GoalsSectionPage {...context} />;
}
