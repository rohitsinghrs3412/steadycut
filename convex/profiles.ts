import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { ancestryValidator, sexValidator } from "./schema";

export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const upsertProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    heightCm: v.optional(v.number()),
    sex: v.optional(sexValidator),
    ancestry: v.optional(ancestryValidator),
    targetCalories: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const patch = {
      ...args,
      displayName: args.displayName?.trim() || undefined,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId,
      ...patch,
      createdAt: now,
    });
  },
});
