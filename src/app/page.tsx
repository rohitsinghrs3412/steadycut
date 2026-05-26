import { redirect } from "next/navigation";

import { PublicEntry } from "@/components/steadycut/public-entry";
import { getOptionalAppUser } from "@/lib/app-auth";
import {
  getMissingSetupItems,
  hasCoreServerConfig,
} from "@/lib/server-config";

export default async function Home() {
  if (hasCoreServerConfig) {
    const user = await getOptionalAppUser();

    if (user) {
      redirect("/dashboard");
    }
  }

  return <PublicEntry missingItems={getMissingSetupItems()} />;
}
