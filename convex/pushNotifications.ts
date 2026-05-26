import { v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getUserId } from "./lib/auth";

export const getCurrentSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return subscriptions[0] ?? null;
  },
});

export const upsertSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    reminderHourLocal: v.number(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const existing = subscriptions.find((s) => s.endpoint === args.endpoint);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushSubscriptions", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateReminderHour = mutation({
  args: {
    reminderHourLocal: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (subscriptions.length === 0) {
      throw new Error("Enable notifications before changing the reminder time.");
    }

    const now = Date.now();
    for (const subscription of subscriptions) {
      await ctx.db.patch(subscription._id, {
        reminderHourLocal: args.reminderHourLocal,
        updatedAt: now,
      });
    }
  },
});

export const deleteSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const subscriptions = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }
  },
});

export const listDueSubscriptions = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("pushSubscriptions").collect();
  },
});

export const markReminderSent = internalMutation({
  args: {
    id: v.id("pushSubscriptions"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      lastSentDate: args.date,
      updatedAt: Date.now(),
    });
  },
});

export const deleteSubscriptionById = internalMutation({
  args: {
    id: v.id("pushSubscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
