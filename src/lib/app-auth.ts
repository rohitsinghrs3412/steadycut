import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { hasAppAuthorizationConfig, serverConfig } from "@/lib/server-config";

type ClerkAuthState = Awaited<ReturnType<typeof auth>>;

type AuthClaims = Record<string, unknown>;

export async function requireAppUser() {
  const authState = await auth();

  if (!authState.userId) {
    redirect("/sign-in");
  }

  if (!(await isAuthorizedAppUser(authState))) {
    redirect("/not-authorized");
  }

  return authState;
}

export async function getOptionalAppUser() {
  const authState = await auth();

  if (!authState.userId || !(await isAuthorizedAppUser(authState))) {
    return null;
  }

  return authState;
}

export async function isAuthorizedAppUser(authState: ClerkAuthState) {
  if (!authState.userId || !hasAppAuthorizationConfig) {
    return false;
  }

  if (serverConfig.allowedUserIds.includes(authState.userId)) {
    return true;
  }

  const claims = (authState.sessionClaims ?? {}) as AuthClaims;
  const email = getFirstStringClaim(claims, [
    "email",
    "email_address",
    "primary_email_address",
    "primaryEmailAddress",
  ])?.toLowerCase();

  if (email && serverConfig.allowedEmails.includes(email)) {
    return true;
  }

  const userEmails = await getCurrentUserEmails();
  if (
    userEmails.some((userEmail) =>
      serverConfig.allowedEmails.includes(userEmail)
    )
  ) {
    return true;
  }

  const orgId =
    authState.orgId ??
    getFirstStringClaim(claims, ["org_id", "orgId", "organization_id"]);
  const orgRole =
    authState.orgRole ?? getFirstStringClaim(claims, ["org_role", "orgRole"]);

  if (orgId && serverConfig.allowedOrgIds.includes(orgId)) {
    return (
      serverConfig.allowedOrgRoles.length === 0 ||
      (orgRole !== undefined && serverConfig.allowedOrgRoles.includes(orgRole))
    );
  }

  return false;
}

async function getCurrentUserEmails(): Promise<string[]> {
  if (serverConfig.allowedEmails.length === 0) {
    return [];
  }

  const user = await currentUser();
  if (!user) {
    return [];
  }

  const list: string[] = [];
  if (user.primaryEmailAddress?.emailAddress) {
    list.push(user.primaryEmailAddress.emailAddress.toLowerCase());
  }
  for (const item of user.emailAddresses) {
    if (item.emailAddress) {
      list.push(item.emailAddress.toLowerCase());
    }
  }

  return Array.from(new Set(list));
}

function getFirstStringClaim(claims: AuthClaims, keys: string[]) {
  for (const key of keys) {
    const value = claims[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}
