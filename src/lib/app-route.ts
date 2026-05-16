import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  getMissingSetupItems,
  hasCoreServerConfig,
  serverConfig,
} from "@/lib/server-config";

export async function getAppRouteContext() {
  const missingItems = getMissingSetupItems();

  if (!hasCoreServerConfig) {
    return {
      mode: "demo" as const,
      missingItems,
      vapidPublicKey: serverConfig.vapidPublicKey,
    };
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return {
    mode: "live" as const,
    missingItems,
    vapidPublicKey: serverConfig.vapidPublicKey,
  };
}
