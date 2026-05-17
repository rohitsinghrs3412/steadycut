"use node";

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { action } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { mealTypeValidator } from "./schema";

const mealItemSchema = z.object({
  name: z.string().min(2).max(150),
  calories: z.number().min(0).max(3000),
  proteinGrams: z.number().min(0).max(250).nullable().optional(),
  carbsGrams: z.number().min(0).max(400).nullable().optional(),
  fatGrams: z.number().min(0).max(250).nullable().optional(),
  portionGrams: z.number().min(0).max(3000).nullable().optional(),
});

const mealEstimateSchema = z.object({
  foodName: z
    .string()
    .min(2)
    .max(150)
    .describe("Short display name for the overall meal."),
  items: z
    .array(mealItemSchema)
    .min(1)
    .max(20)
    .describe("Separate visible meal items with kcal and macro estimates."),
  confidence: z
    .number()
    .min(0.05)
    .max(100)
    .describe(
      "Confidence from 0.05 to 1. If using a 1-10 or 1-100 scale, the server will normalize it."
    ),
  assumptions: z.array(z.string().min(3).max(140)).min(1).max(15),
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
        "You estimate calories from food photos for a private Indian user. Return careful estimates, not medical advice. Consider common Indian foods, oil/ghee, sauces, fried items, rice/roti portions, and visible serving size. Always make the best reasonable estimate from the photo and provided text. Confidence must be a decimal from 0.05 to 1, not a 1-10 score. If portion grams are provided, use them and do not ask for grams again. If the user says oily, fried, not oily, grilled, baked, or similar, use that and do not ask about oil/frying again. Only include one follow-up question for genuinely missing details that would materially change the estimate. Do not shame the user.",
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
    confidence: normalizeConfidence(estimate.confidence),
    items: estimate.items.map(normalizeMealItem),
    followUpQuestion: refineFollowUpQuestion(
      estimate.followUpQuestion ?? undefined,
      context
    ),
  };
}

function normalizeConfidence(confidence: number) {
  const normalized =
    confidence > 10 ? confidence / 100 : confidence > 1 ? confidence / 10 : confidence;

  return Math.min(Math.max(normalized, 0.05), 1);
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
