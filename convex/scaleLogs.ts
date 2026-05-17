import { anyApi } from "convex/server";
import { v } from "convex/values";

import { action, internalMutation, mutation, query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { scaleTimeOfDayValidator } from "./schema";

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const logs = await ctx.db
      .query("scaleLogs")
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

export const analyzeScalePhoto = action({
  args: {
    date: v.string(),
    timeOfDay: scaleTimeOfDayValidator,
    photoId: v.id("_storage"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(anyApi.scaleAnalysis.analyzeScalePhoto, args);
  },
});

export const saveScaleLog = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    timeOfDay: scaleTimeOfDayValidator,
    photoId: v.id("_storage"),
    weightKg: v.optional(v.number()),
    rawReading: v.optional(v.string()),
    confidence: v.number(),
    needsManualReview: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    const id = await ctx.db.insert("scaleLogs", {
      ...args,
      createdAt,
    });

    if (args.weightKg) {
      const existingCheckIn = await ctx.db
        .query("checkIns")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", args.userId).eq("date", args.date)
        )
        .unique();
      const note =
        existingCheckIn?.note ??
        `Scale photo ${args.timeOfDay} reading${args.rawReading ? `: ${args.rawReading}` : ""}.`;

      if (existingCheckIn) {
        await ctx.db.patch(existingCheckIn._id, {
          weight: args.weightKg,
          note,
          updatedAt: createdAt,
        });
      } else {
        await ctx.db.insert("checkIns", {
          userId: args.userId,
          date: args.date,
          weight: args.weightKg,
          note,
          mood: "good",
          completedHabitIds: [],
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    return {
      id,
      ...args,
      createdAt,
      photoUrl: await ctx.storage.getUrl(args.photoId),
    };
  },
});

export const updateWeight = mutation({
  args: {
    id: v.id("scaleLogs"),
    weightKg: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Unauthorized or scale log not found");
    }

    const updatedAt = Date.now();
    await ctx.db.patch(args.id, {
      weightKg: args.weightKg,
      needsManualReview: false,
      confidence: 1.0,
    });

    const existingCheckIn = await ctx.db
      .query("checkIns")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", existing.date)
      )
      .unique();

    const note =
      existingCheckIn?.note ??
      `Scale photo ${existing.timeOfDay} reading (manually corrected): ${args.weightKg} kg.`;

    if (existingCheckIn) {
      await ctx.db.patch(existingCheckIn._id, {
        weight: args.weightKg,
        note,
        updatedAt,
      });
    } else {
      await ctx.db.insert("checkIns", {
        userId,
        date: existing.date,
        weight: args.weightKg,
        note,
        mood: "good",
        completedHabitIds: [],
        createdAt: updatedAt,
        updatedAt,
      });
    }

    return {
      success: true,
    };
  },
});

