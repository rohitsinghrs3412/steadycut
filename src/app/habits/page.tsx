import { HabitsSectionPage } from "@/components/steadycut/sections/habits-section";
import { getAppRouteContext } from "@/lib/app-route";

export default async function HabitsPage() {
  const context = await getAppRouteContext();

  return <HabitsSectionPage {...context} />;
}
