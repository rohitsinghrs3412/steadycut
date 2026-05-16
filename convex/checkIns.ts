import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { moodValidator } from "./schema";
import { getUserId } from "./lib/auth";

export const upsertCheckIn = mutation({
  args: {
    date: v.string(),
    weight: v.number(),
    note: v.optional(v.string()),
    mood: moodValidator,
    completedHabitIds: v.array(v.id("habits")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("checkIns")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        note: args.note,
        mood: args.mood,
        completedHabitIds: args.completedHabitIds,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("checkIns", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});
