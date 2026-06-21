import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NotAuthorizedScreen } from "@/components/steadycut/not-authorized-screen";

export default async function NotAuthorizedPage() {
  const authState = await auth();

  if (!authState.userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId
    )?.emailAddress ??
    "No primary email found";

  return <NotAuthorizedScreen email={email} />;
}
