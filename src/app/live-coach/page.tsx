import { LiveCoachScreen } from "@/components/steadycut/live-coach-screen";
import { getAppRouteContext } from "@/lib/app-route";

export default async function LiveCoachPage() {
  const context = await getAppRouteContext();

  return (
    <LiveCoachScreen
      {...context}
      hasGemini={!context.missingItems.includes("GOOGLE_GENERATIVE_AI_API_KEY")}
    />
  );
}
