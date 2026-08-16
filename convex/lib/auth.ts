import type { GenericActionCtx, GenericDataModel } from "convex/server";

import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx =
  | QueryCtx
  | MutationCtx
  | ActionCtx
  | GenericActionCtx<GenericDataModel>;

export async function getUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Authentication required.");
  }

  if (!isAuthorizedIdentity(identity)) {
    throw new Error("Not authorized.");
  }

  return identity.subject;
}

function isAuthorizedIdentity(identity: {
  subject: string;
  email?: string;
  [key: string]: unknown;
}) {
  const allowedUserIds = parseCsvEnv(process.env.STEADYCUT_ALLOWED_USER_IDS);
  const allowedEmails = parseCsvEnv(
    process.env.STEADYCUT_ALLOWED_EMAILS || "ragbabita@gmail.com"
  ).map((email) => email.toLowerCase());
  const allowedOrgIds = parseCsvEnv(process.env.STEADYCUT_ALLOWED_ORG_IDS);
  const allowedOrgRoles = parseCsvEnv(process.env.STEADYCUT_ALLOWED_ORG_ROLES);

  if (
    allowedUserIds.length === 0 &&
    allowedEmails.length === 0 &&
    allowedOrgIds.length === 0
  ) {
    return false;
  }

  if (allowedUserIds.includes(identity.subject)) {
    return true;
  }

  const email = identity.email?.toLowerCase();
  if (email && allowedEmails.includes(email)) {
    return true;
  }

  const orgId = getStringClaim(identity, [
    "org_id",
    "orgId",
    "organization_id",
  ]);
  const orgRole = getStringClaim(identity, ["org_role", "orgRole"]);

  if (orgId && allowedOrgIds.includes(orgId)) {
    return (
      allowedOrgRoles.length === 0 ||
      (orgRole !== undefined && allowedOrgRoles.includes(orgRole))
    );
  }

  return false;
}

function getStringClaim(claims: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = claims[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function parseCsvEnv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
