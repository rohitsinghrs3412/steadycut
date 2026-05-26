import { requireAppUser } from "@/lib/app-auth";
import {
  getMissingSetupItems,
  hasCoreServerConfig,
  isLiveModeMisconfigured,
  serverConfig,
} from "@/lib/server-config";

export async function getAppRouteContext() {
  const missingItems = getMissingSetupItems();

  if (isLiveModeMisconfigured) {
    return {
      mode: "setup" as const,
      missingItems,
      vapidPublicKey: serverConfig.vapidPublicKey,
    };
  }

  if (!hasCoreServerConfig) {
    return {
      mode: "demo" as const,
      missingItems,
      vapidPublicKey: serverConfig.vapidPublicKey,
    };
  }

  await requireAppUser();

  return {
    mode: "live" as const,
    missingItems,
    vapidPublicKey: serverConfig.vapidPublicKey,
  };
}
