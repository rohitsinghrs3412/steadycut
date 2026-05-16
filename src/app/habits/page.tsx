import { HabitsSectionPage } from "@/components/steadycut/section-pages";
import { getAppRouteContext } from "@/lib/app-route";

export default async function HabitsPage() {
  const context = await getAppRouteContext();

  return <HabitsSectionPage {...context} />;
}
