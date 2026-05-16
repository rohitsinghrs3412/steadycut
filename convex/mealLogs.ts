import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { action, internalMutation, mutation, query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { mealItemValidator, mealTypeValidator } from "./schema";

const mealItemSchema = z.object({
  name: z.string().min(2).max(90),
  calories: z.number().min(1).max(3000),
  proteinGrams: z.number().min(0).max(250).nullable().optional(),
  carbsGrams: z.number().min(0).max(400).nullable().optional(),
  fatGrams: z.number().min(0).max(250).nullable().optional(),
  portionGrams: z.number().min(0).max(3000).nullable().optional(),
});

const mealEstimateSchema = z.object({
  foodName: z
    .string()
    .min(2)
    .max(90)
    .describe("Short display name for the overall meal."),
  items: z
    .array(mealItemSchema)
    .min(1)
    .max(8)
    .describe("Separate visible meal items with kcal and macro estimates."),
  confidence: z
    .number()
    .min(0.05)
    .max(1)
    .describe("Confidence from 0.05 to 1. Use lower values for unclear photos."),
  assumptions: z.array(z.string().min(3).max(140)).min(1).max(5),
  followUpQuestion: z.string().min(5).max(180).nullable().optional(),
});

type MealEstimate = z.infer<typeof mealEstimateSchema>;
type SavedMealItem = {
  name: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
};
type SavedMealEstimate = Omit<MealEstimate, "items" | "followUpQuestion"> & {
  items: SavedMealItem[];
  followUpQuestion?: string;
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
    const userId = await getUserId(ctx);
    const blob = await ctx.storage.get(args.photoId);

    if (!blob) {
      throw new Error("Uploaded meal photo could not be found.");
    }

    const image = await blob.arrayBuffer();
    const mediaType = blob.type || "image/jpeg";
    const estimate = await estimateMeal({
      image,
      mediaType,
      mealType: args.mealType,
      description: args.description,
      portionGrams: args.portionGrams,
    });

    if (args.placeholderMealLogId) {
      const placeholder = await ctx.runQuery(anyApi.mealLogs.getMealLogForUser, {
        id: args.placeholderMealLogId,
      });

      if (!placeholder) {
        throw new Error("Meal placeholder not found.");
      }

      return {
        id: args.placeholderMealLogId,
        userId,
        date: args.date,
        mealType: args.mealType,
        photoId: args.photoId,
        description: args.description,
        portionGrams: args.portionGrams,
        status: "ready" as const,
        ...summarizeMealEstimate(estimate),
        confidence: estimate.confidence,
        assumptions: estimate.assumptions,
        followUpQuestion: estimate.followUpQuestion,
        createdAt: placeholder.createdAt,
        updatedAt: Date.now(),
        photoUrl: await ctx.storage.getUrl(args.photoId),
      };
    }

    return await ctx.runMutation(anyApi.mealLogs.saveMealLog, {
      userId,
      date: args.date,
      mealType: args.mealType,
      photoId: args.photoId,
      description: args.description,
      portionGrams: args.portionGrams,
      existingMealLogId: args.existingMealLogId,
      ...estimate,
    });
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

async function estimateMeal({
  image,
  mediaType,
  mealType,
  description,
  portionGrams,
}: {
  image: ArrayBuffer;
  mediaType: string;
  mealType: string;
  description?: string;
  portionGrams?: number;
}): Promise<SavedMealEstimate> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "Gemini is not configured yet. Add the Google AI Studio API key, then try this meal again."
    );
  }

  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: mealEstimateSchema }),
      system:
        "You estimate calories from food photos for a private Indian user. Return careful estimates, not medical advice. Consider common Indian foods, oil/ghee, sauces, fried items, rice/roti portions, and visible serving size. Always make the best reasonable estimate from the photo and provided text. If portion grams are provided, use them and do not ask for grams again. If the user says oily, fried, not oily, grilled, baked, or similar, use that and do not ask about oil/frying again. Only include one follow-up question for genuinely missing details that would materially change the estimate. Do not shame the user.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Meal type: ${mealType}`,
                `User description: ${description?.trim() || "not provided"}`,
                `Portion grams: ${portionGrams ?? "not provided"}`,
                "Estimate total calories and macros for the full meal. Prefer kg/grams units. Keep assumptions concrete and include supplied grams/oil details in the assumptions when relevant.",
                "Split visible foods into separate items whenever useful, such as rice, dal, paneer, roti, sabzi, chutney, dessert, or drink. Return item calories and macros; the server will sum totals.",
              ].join("\n"),
            },
            {
              type: "image",
              image,
              mediaType,
            },
          ],
        },
      ],
    });

    return normalizeMealEstimate(output, { description, portionGrams });
  } catch (caught) {
    console.error("Meal analysis failed", caught);
    throw new Error(
      "Gemini could not return a valid calorie estimate. The meal was not saved; add any missing food details and try again."
    );
  }
}

function normalizeMealEstimate(
  estimate: MealEstimate,
  context: { description?: string; portionGrams?: number }
): SavedMealEstimate {
  return {
    ...estimate,
    items: estimate.items.map(normalizeMealItem),
    followUpQuestion: refineFollowUpQuestion(
      estimate.followUpQuestion ?? undefined,
      context
    ),
  };
}

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

function summarizeMealEstimate(estimate: SavedMealEstimate) {
  return {
    ...summarizeMealItems(estimate.items),
    foodName: estimate.foodName,
    items: estimate.items.map(normalizeMealItem),
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

function refineFollowUpQuestion(
  question: string | undefined,
  {
    description,
    portionGrams,
  }: {
    description?: string;
    portionGrams?: number;
  }
) {
  if (!question) {
    return undefined;
  }

  const normalizedQuestion = question.toLowerCase();
  const normalizedDescription = description?.toLowerCase() ?? "";
  const asksForPortion =
    /\b(gram|grams|gms|portion|quantity|amount|weight|size)\b/.test(
      normalizedQuestion
    );
  const asksForOil =
    /\b(oil|oily|fried|fry|ghee|butter|grilled|baked|roasted)\b/.test(
      normalizedQuestion
    );
  const hasPortion = typeof portionGrams === "number" && portionGrams > 0;
  const hasOilDetail =
    /\b(oil|oily|fried|fry|ghee|butter|grilled|baked|roasted|not oily|less oil|no oil)\b/.test(
      normalizedDescription
    );

  if (asksForPortion && hasPortion && asksForOil && !hasOilDetail) {
    return "Was it oily, fried, or cooked with extra oil/ghee?";
  }

  if (asksForOil && hasOilDetail && asksForPortion && !hasPortion) {
    return "What was the approximate portion size in grams?";
  }

  if (
    (asksForPortion || asksForOil) &&
    (!asksForPortion || hasPortion) &&
    (!asksForOil || hasOilDetail)
  ) {
    return undefined;
  }

  return question;
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
