import dynamic from "next/dynamic";
import { getAppRouteContext } from "@/lib/app-route";

const LiveCoachScreen = dynamic(
  () =>
    import("@/components/steadycut/live-coach-screen").then(
      (mod) => mod.LiveCoachScreen
    )
);

export default async function LiveCoachPage() {
  const context = await getAppRouteContext();

  return (
    <LiveCoachScreen
      {...context}
      hasGemini={!context.missingItems.includes("GOOGLE_GENERATIVE_AI_API_KEY")}
    />
  );
}
