import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DemoDashboard } from "@/components/steadycut/demo-dashboard";
import { LiveDashboard } from "@/components/steadycut/live-dashboard";
import {
  getMissingSetupItems,
  hasCoreServerConfig,
} from "@/lib/server-config";

export default async function DashboardPage() {
  const missingItems = getMissingSetupItems();

  if (!hasCoreServerConfig) {
    return <DemoDashboard missingItems={missingItems} />;
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <LiveDashboard missingItems={missingItems} />;
}
