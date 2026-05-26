import { DemoDashboard } from "@/components/steadycut/demo-dashboard";
import { LiveDashboard } from "@/components/steadycut/live-dashboard";
import { SetupNotice } from "@/components/steadycut/setup-notice";
import { requireAppUser } from "@/lib/app-auth";
import {
  getMissingSetupItems,
  hasCoreServerConfig,
  isLiveModeMisconfigured,
} from "@/lib/server-config";

export default async function DashboardPage() {
  const missingItems = getMissingSetupItems();

  if (isLiveModeMisconfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-xl">
          <SetupNotice missingItems={missingItems} />
        </div>
      </main>
    );
  }

  if (!hasCoreServerConfig) {
    return <DemoDashboard missingItems={missingItems} />;
  }

  await requireAppUser();

  return <LiveDashboard missingItems={missingItems} />;
}
