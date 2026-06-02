import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";

import { action, internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { getUserId } from "./lib/auth";

const HYDRATION_TARGET_ML = 2000;
const MIN_HYDRATION_VOLUME_ML = 30;
const MAX_HYDRATION_VOLUME_ML = 5000;
const MAX_BEVERAGE_NAME_CHARS = 80;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
        photoUrl: log.photoId ? await ctx.storage.getUrl(log.photoId) : null,
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
    validateDateKey(args.date);
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

export const logManualHydration = mutation({
  args: {
    date: v.string(),
    volumeMl: v.number(),
    beverageName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const normalizedVolumeMl = normalizeHydrationVolume(args.volumeMl);
    const beverageName = normalizeBeverageName(args.beverageName);

    validateDateKey(args.date);

    const id = await ctx.db.insert("hydrationLogs", {
      userId,
      date: args.date,
      beverageName,
      containerName: "Quick Add",
      volumeMl: normalizedVolumeMl,
      confidence: 1.0,
      assumptions: ["Logged manually via quick-add buttons."],
      createdAt: now,
      updatedAt: now,
    });

    await syncWaterHabitForDate(ctx, userId, args.date);

    return {
      id,
      userId,
      date: args.date,
      beverageName,
      containerName: "Quick Add",
      volumeMl: normalizedVolumeMl,
      confidence: 1.0,
      assumptions: ["Logged manually via quick-add buttons."],
      createdAt: now,
      updatedAt: now,
      photoUrl: null,
    };
  },
});

function validateDateKey(date: string) {
  if (!DATE_KEY_PATTERN.test(date)) {
    throw new ConvexError("Date must use YYYY-MM-DD format.");
  }
}

function normalizeHydrationVolume(volumeMl: number) {
  const normalizedVolumeMl = Math.round(volumeMl);

  if (
    !Number.isFinite(normalizedVolumeMl) ||
    normalizedVolumeMl < MIN_HYDRATION_VOLUME_ML ||
    normalizedVolumeMl > MAX_HYDRATION_VOLUME_ML
  ) {
    throw new ConvexError(
      `Hydration amount must be between ${MIN_HYDRATION_VOLUME_ML} ml and ${MAX_HYDRATION_VOLUME_ML} ml.`
    );
  }

  return normalizedVolumeMl;
}

function normalizeBeverageName(beverageName: string) {
  const normalizedName = beverageName.trim() || "Water";

  if (normalizedName.length > MAX_BEVERAGE_NAME_CHARS) {
    throw new ConvexError(
      `Beverage name must be ${MAX_BEVERAGE_NAME_CHARS} characters or less.`
    );
  }

  return normalizedName;
}

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
