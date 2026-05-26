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

  const userEmail = await getCurrentUserEmail();
  if (userEmail && serverConfig.allowedEmails.includes(userEmail)) {
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

async function getCurrentUserEmail() {
  if (serverConfig.allowedEmails.length === 0) {
    return null;
  }

  const user = await currentUser();
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress ??
    null;

  return primaryEmail?.toLowerCase() ?? null;
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
