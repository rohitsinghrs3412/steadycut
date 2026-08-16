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

  return identity.subject;
}
