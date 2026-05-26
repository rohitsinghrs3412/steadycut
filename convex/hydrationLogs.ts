import { anyApi } from "convex/server";
import { v } from "convex/values";

import { action, internalMutation, query, type MutationCtx } from "./_generated/server";
import { getUserId } from "./lib/auth";

const HYDRATION_TARGET_ML = 2000;

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const logs = await ctx.db
      .query("hydrationLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 20);

    return await Promise.all(
      logs.map(async (log) => ({
        id: log._id,
        ...log,
        photoUrl: await ctx.storage.getUrl(log.photoId),
      }))
    );
  },
});

export const analyzeHydrationPhoto = action({
  args: {
    date: v.string(),
    photoId: v.id("_storage"),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(anyApi.hydrationAnalysis.analyzeHydrationPhoto, args);
  },
});

export const saveHydrationLog = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    photoId: v.id("_storage"),
    beverageName: v.string(),
    containerName: v.string(),
    volumeMl: v.number(),
    confidence: v.number(),
    assumptions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedVolumeMl = Math.max(0, Math.round(args.volumeMl));
    const cleanedAssumptions = args.assumptions
      .map((assumption) => assumption.trim())
      .filter(Boolean);
    const normalizedAssumptions =
      cleanedAssumptions.length > 0
        ? cleanedAssumptions
        : ["Estimated from the beverage photo."];
    const id = await ctx.db.insert("hydrationLogs", {
      ...args,
      beverageName: args.beverageName.trim() || "Beverage",
      containerName: args.containerName.trim() || "Container",
      volumeMl: normalizedVolumeMl,
      confidence: Math.min(Math.max(args.confidence, 0), 1),
      assumptions: normalizedAssumptions,
      createdAt: now,
      updatedAt: now,
    });

    await syncWaterHabitForDate(ctx, args.userId, args.date);

    return {
      id,
      userId: args.userId,
      date: args.date,
      photoId: args.photoId,
      beverageName: args.beverageName.trim() || "Beverage",
      containerName: args.containerName.trim() || "Container",
      volumeMl: normalizedVolumeMl,
      confidence: Math.min(Math.max(args.confidence, 0), 1),
      assumptions: normalizedAssumptions,
      createdAt: now,
      updatedAt: now,
      photoUrl: await ctx.storage.getUrl(args.photoId),
    };
  },
});

async function syncWaterHabitForDate(
  ctx: MutationCtx,
  userId: string,
  date: string
) {
  const logs = await ctx.db
    .query("hydrationLogs")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
    .collect();
  const totalMl = logs.reduce((total, log) => total + log.volumeMl, 0);

  if (totalMl < HYDRATION_TARGET_ML) {
    return;
  }

  const waterHabit = (
    await ctx.db
      .query("habits")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true)
      )
      .collect()
  ).find(
    (habit) =>
      habit.iconKey === "droplet" || /water|hydration/i.test(habit.name)
  );

  if (!waterHabit) {
    return;
  }

  const checkIn = await ctx.db
    .query("checkIns")
    .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
    .unique();

  if (!checkIn || checkIn.completedHabitIds.includes(waterHabit._id)) {
    return;
  }

  await ctx.db.patch(checkIn._id, {
    completedHabitIds: [...checkIn.completedHabitIds, waterHabit._id],
    updatedAt: Date.now(),
  });
}
