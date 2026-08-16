import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type ClerkAuthState = Awaited<ReturnType<typeof auth>>;

export async function requireAppUser() {
  const authState = await auth();

  if (!authState.userId) {
    redirect("/sign-in");
  }

  return authState;
}

export async function getOptionalAppUser() {
  const authState = await auth();

  if (!authState.userId) {
    return null;
  }

  return authState;
}

export async function isAuthorizedAppUser(authState: ClerkAuthState) {
  return Boolean(authState.userId);
}
