import { anyApi } from "convex/server";
import { v } from "convex/values";

import { action, internalMutation, mutation, query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { mealItemValidator, mealTypeValidator } from "./schema";

type SavedMealItem = {
  name: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
};

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const limit = args.limit ?? 20;
    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit * 3);

    return await Promise.all(
      logs
        .filter((log) => !isFailedMealEstimate(log))
        .slice(0, limit)
        .map(async (log) => ({
          id: log._id,
          ...log,
          items: getMealItems(log),
          photoUrl: await ctx.storage.getUrl(log.photoId),
        }))
    );
  },
});

export const analyzeMealPhoto = action({
  args: {
    date: v.string(),
    mealType: mealTypeValidator,
    photoId: v.id("_storage"),
    description: v.optional(v.string()),
    portionGrams: v.optional(v.number()),
    existingMealLogId: v.optional(v.id("mealLogs")),
    placeholderMealLogId: v.optional(v.id("mealLogs")),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(anyApi.mealAnalysis.analyzeMealPhoto, args);
  },
});

export const getMealLogForUser = query({
  args: {
    id: v.id("mealLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const log = await ctx.db.get(args.id);

    if (!log || log.userId !== userId) {
      return null;
    }

    return log;
  },
});

export const savePlaceholder = mutation({
  args: {
    date: v.string(),
    mealType: mealTypeValidator,
    photoId: v.id("_storage"),
    description: v.optional(v.string()),
    portionGrams: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const id = await ctx.db.insert("mealLogs", {
      userId,
      date: args.date,
      mealType: args.mealType,
      photoId: args.photoId,
      status: "estimating",
      description: args.description,
      portionGrams: args.portionGrams,
      foodName: "Estimating meal...",
      items: [],
      calories: 0,
      confidence: 0,
      assumptions: ["Analyzing photo."],
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

export const saveConfirmedMealLog = mutation({
  args: {
    id: v.id("mealLogs"),
    date: v.string(),
    mealType: mealTypeValidator,
    description: v.optional(v.string()),
    portionGrams: v.optional(v.number()),
    foodName: v.string(),
    items: v.array(mealItemValidator),
    confidence: v.number(),
    assumptions: v.array(v.string()),
    followUpQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const existing = await ctx.db.get(args.id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Meal log not found.");
    }

    const summary = summarizeMealItems(args.items);
    const now = Date.now();

    await ctx.db.patch(args.id, {
      date: args.date,
      mealType: args.mealType,
      description: args.description,
      portionGrams: args.portionGrams,
      foodName: args.foodName.trim() || summary.foodName,
      items: args.items.map(normalizeMealItem),
      calories: summary.calories,
      proteinGrams: summary.proteinGrams,
      carbsGrams: summary.carbsGrams,
      fatGrams: summary.fatGrams,
      confidence: args.confidence,
      assumptions: args.assumptions,
      followUpQuestion: args.followUpQuestion,
      status: "ready",
      updatedAt: now,
    });

    return {
      id: args.id,
      userId,
      date: args.date,
      mealType: args.mealType,
      photoId: existing.photoId,
      description: args.description,
      portionGrams: args.portionGrams,
      foodName: args.foodName.trim() || summary.foodName,
      items: args.items.map(normalizeMealItem),
      calories: summary.calories,
      proteinGrams: summary.proteinGrams,
      carbsGrams: summary.carbsGrams,
      fatGrams: summary.fatGrams,
      confidence: args.confidence,
      assumptions: args.assumptions,
      followUpQuestion: args.followUpQuestion,
      status: "ready" as const,
      createdAt: existing.createdAt,
      updatedAt: now,
      photoUrl: await ctx.storage.getUrl(existing.photoId),
    };
  },
});

export const deleteMealLog = mutation({
  args: {
    id: v.id("mealLogs"),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const existing = await ctx.db.get(args.id);

    if (!existing || existing.userId !== userId) {
      throw new Error("Meal log not found.");
    }

    await ctx.db.delete(args.id);
  },
});

export const deleteMealLogForUser = internalMutation({
  args: {
    id: v.id("mealLogs"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);

    if (existing && existing.userId === args.userId) {
      await ctx.db.delete(args.id);
    }
  },
});

export const migrateSingleItemMealLogs = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const logs = await ctx.db
      .query("mealLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    let migrated = 0;

    for (const log of logs) {
      if (log.items && log.items.length > 0) {
        continue;
      }

      await ctx.db.patch(log._id, {
        items: getMealItems(log),
        status: log.status ?? "ready",
        updatedAt: Date.now(),
      });
      migrated += 1;
    }

    return migrated;
  },
});

export const saveMealLog = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    mealType: mealTypeValidator,
    photoId: v.id("_storage"),
    description: v.optional(v.string()),
    portionGrams: v.optional(v.number()),
    existingMealLogId: v.optional(v.id("mealLogs")),
    foodName: v.string(),
    items: v.array(mealItemValidator),
    confidence: v.number(),
    assumptions: v.array(v.string()),
    followUpQuestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const { existingMealLogId, ...doc } = args;
    const summary = summarizeMealItems(args.items);

    if (summary.calories <= 0 || args.confidence <= 0) {
      throw new Error("Meal estimate was not saved because analysis failed.");
    }

    if (existingMealLogId) {
      const existing = await ctx.db.get(existingMealLogId);

      if (!existing || existing.userId !== args.userId) {
        throw new Error("Meal log not found.");
      }

      await ctx.db.patch(existingMealLogId, {
        ...doc,
        ...summary,
        items: args.items.map(normalizeMealItem),
        status: "ready",
        updatedAt: now,
      });

      return {
        id: existingMealLogId,
        ...doc,
        ...summary,
        items: args.items.map(normalizeMealItem),
        status: "ready" as const,
        createdAt: existing.createdAt,
        updatedAt: now,
        photoUrl: await ctx.storage.getUrl(args.photoId),
      };
    }

    const id = await ctx.db.insert("mealLogs", {
      ...doc,
      ...summary,
      items: args.items.map(normalizeMealItem),
      status: "ready",
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      ...doc,
      ...summary,
      items: args.items.map(normalizeMealItem),
      status: "ready" as const,
      createdAt: now,
      updatedAt: now,
      photoUrl: await ctx.storage.getUrl(args.photoId),
    };
  },
});

function normalizeMealItem(item: {
  name: string;
  calories: number;
  proteinGrams?: number | null;
  carbsGrams?: number | null;
  fatGrams?: number | null;
  portionGrams?: number | null;
}): SavedMealItem {
  return {
    name: item.name.trim(),
    calories: Math.max(Math.round(item.calories), 0),
    proteinGrams: item.proteinGrams ?? undefined,
    carbsGrams: item.carbsGrams ?? undefined,
    fatGrams: item.fatGrams ?? undefined,
    portionGrams: item.portionGrams ?? undefined,
  };
}

function summarizeMealItems(items: SavedMealItem[]) {
  const normalizedItems = items.map(normalizeMealItem);
  const calories = normalizedItems.reduce((total, item) => total + item.calories, 0);
  const proteinGrams = sumOptionalMacro(normalizedItems, "proteinGrams");
  const carbsGrams = sumOptionalMacro(normalizedItems, "carbsGrams");
  const fatGrams = sumOptionalMacro(normalizedItems, "fatGrams");

  return {
    foodName:
      normalizedItems.length > 1
        ? `${normalizedItems[0]?.name ?? "Meal"} + ${normalizedItems.length - 1}`
        : normalizedItems[0]?.name ?? "Meal",
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}

function sumOptionalMacro(
  items: SavedMealItem[],
  key: "proteinGrams" | "carbsGrams" | "fatGrams"
) {
  const total = items.reduce((sum, item) => sum + (item[key] ?? 0), 0);

  return total > 0 ? total : undefined;
}

function getMealItems(meal: {
  foodName: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
  items?: SavedMealItem[];
}) {
  if (meal.items) {
    return meal.items.map(normalizeMealItem);
  }

  if (meal.calories <= 0) {
    return [];
  }

  return [
    {
      name: meal.foodName,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      portionGrams: meal.portionGrams,
    },
  ];
}

function isFailedMealEstimate(meal: {
  foodName: string;
  calories: number;
  confidence: number;
  status?: "estimating" | "ready";
}) {
  if (meal.status === "estimating") {
    return false;
  }

  return (
    meal.calories <= 0 ||
    meal.confidence <= 0 ||
    meal.foodName.trim().toLowerCase() === "could not analyze meal" ||
    meal.foodName.trim().toLowerCase() === "gemini setup needed"
  );
}
