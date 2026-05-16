import { mutation } from "./_generated/server";
import { defaultHabits } from "./lib/defaultHabits";
import { getUserId } from "./lib/auth";
import {
  habitColorValidator,
  habitIconValidator,
} from "./schema";
import { v } from "convex/values";

export const ensureDefaultHabits = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const existingHabits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existingHabits.length > 0) {
      return existingHabits.map((habit) => habit._id);
    }

    const ids = [];

    for (const habit of defaultHabits) {
      ids.push(
        await ctx.db.insert("habits", {
          ...habit,
          userId,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    return ids;
  },
});

export const addHabit = mutation({
  args: {
    name: v.string(),
    iconKey: habitIconValidator,
    color: habitColorValidator,
    targetCadence: v.union(v.literal("daily"), v.literal("weekly")),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const existingHabits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const maxSortOrder = existingHabits.reduce(
      (max, habit) => Math.max(max, habit.sortOrder),
      -1
    );

    return await ctx.db.insert("habits", {
      userId,
      name: args.name.trim(),
      iconKey: args.iconKey,
      color: args.color,
      targetCadence: args.targetCadence,
      active: args.active ?? true,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateHabit = mutation({
  args: {
    id: v.id("habits"),
    name: v.string(),
    iconKey: habitIconValidator,
    color: habitColorValidator,
    targetCadence: v.union(v.literal("daily"), v.literal("weekly")),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const habit = await ctx.db.get(args.id);

    if (!habit || habit.userId !== userId) {
      throw new Error("Habit not found.");
    }

    await ctx.db.patch(args.id, {
      name: args.name.trim(),
      iconKey: args.iconKey,
      color: args.color,
      targetCadence: args.targetCadence,
      active: args.active,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

export const deleteHabit = mutation({
  args: {
    id: v.id("habits"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const habit = await ctx.db.get(args.id);

    if (!habit || habit.userId !== userId) {
      throw new Error("Habit not found.");
    }

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const checkIn of checkIns) {
      if (checkIn.completedHabitIds.includes(args.id)) {
        await ctx.db.patch(checkIn._id, {
          completedHabitIds: checkIn.completedHabitIds.filter(
            (habitId) => habitId !== args.id
          ),
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.delete(args.id);
  },
});

export const reorderHabits = mutation({
  args: {
    habits: v.array(
      v.object({
        id: v.id("habits"),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();

    for (const item of args.habits) {
      const habit = await ctx.db.get(item.id);

      if (!habit || habit.userId !== userId) {
        throw new Error("Habit not found.");
      }
    }

    for (const item of args.habits) {
      await ctx.db.patch(item.id, {
        sortOrder: item.sortOrder,
        updatedAt: now,
      });
    }
  },
});
