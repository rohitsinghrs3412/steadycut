import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PublicEntry } from "@/components/steadycut/public-entry";
import {
  getMissingSetupItems,
  hasCoreServerConfig,
} from "@/lib/server-config";

export default async function Home() {
  if (hasCoreServerConfig) {
    const { userId } = await auth();

    if (userId) {
      redirect("/dashboard");
    }
  }

  return <PublicEntry missingItems={getMissingSetupItems()} />;
}
