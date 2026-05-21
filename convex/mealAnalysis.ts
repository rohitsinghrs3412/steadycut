"use node";

import { google } from "@ai-sdk/google";
import { APICallError, generateText, NoObjectGeneratedError, Output } from "ai";
import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { action } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { mealTypeValidator } from "./schema";

const MAX_REASONABLE_PORTION_GRAMS = 5000;
const NON_FOOD_DESCRIPTION_PATTERN =
  /\b(human|human being|person|people|man|woman|boy|girl|child|face|selfie|body)\b/i;

const mealItemSchema = z.object({
  name: z.string().min(2).max(250),
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
    .max(250)
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
  assumptions: z.array(z.string().min(3).max(500)).min(1).max(15),
  followUpQuestion: z.string().min(5).max(500).nullable().optional(),
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

    try {
      validateMealRequest(args);

      const blob = await ctx.storage.get(args.photoId);

      if (!blob) {
        throw new ConvexError("Uploaded meal photo could not be found.");
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

      return await ctx.runMutation(anyApi.mealLogs.saveMealLog, {
        userId,
        date: args.date,
        mealType: args.mealType,
        photoId: args.photoId,
        description: args.description,
        portionGrams: args.portionGrams,
        existingMealLogId:
          args.placeholderMealLogId ?? args.existingMealLogId,
        ...estimate,
      });
    } catch (caught) {
      if (args.placeholderMealLogId) {
        try {
          await ctx.runMutation(anyApi.mealLogs.deleteMealLogForUser, {
            id: args.placeholderMealLogId,
            userId,
          });
        } catch (cleanupError) {
          console.error("Failed to clean up meal placeholder", cleanupError);
        }
      }

      throw getClientSafeMealAnalysisError(caught);
    }
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
      maxRetries: 4,
      timeout: { totalMs: 60000 },
      output: Output.object({ schema: mealEstimateSchema }),
      system:
        "You estimate calories from food photos for a private Indian user. Return careful estimates, not medical advice. Consider common Indian foods, oil/ghee, sauces, fried items, rice/roti portions, and visible serving size. Always make the best reasonable estimate from the photo and/or the user description. If the photo shows packaging, a carton, a label, or the food/drink is not directly visible but the user description specifies what it is (e.g. 'Milk 200ml'), estimate the food/drink using the user description. Never return an empty items array if food/drink details are present in the user description. If absolutely no food can be identified in either the photo or description, return a single item with 0 calories named 'Unrecognized' with a low confidence (0.05) and explain this in the assumptions, so that schema validation does not fail. Confidence must be a decimal from 0.05 to 1, not a 1-10 score. If portion grams are provided, use them and do not ask for grams again. If the user says oily, fried, not oily, grilled, baked, or similar, use that and do not ask about oil/frying again. Only include one follow-up question for genuinely missing details that would materially change the estimate. Do not shame the user.",
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
                "Split foods into separate items whenever useful, such as rice, dal, paneer, roti, sabzi, chutney, dessert, or drink. If the food packaging or carton is pictured, use the user's description (e.g. 'Milk 200ml') to estimate the item(s). Return item calories and macros; the server will sum totals.",
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
    throw getClientSafeMealAnalysisError(caught);
  }
}

function getClientSafeMealAnalysisError(caught: unknown) {
  if (caught instanceof ConvexError) {
    return caught;
  }

  if (APICallError.isInstance(caught)) {
    if (caught.statusCode === 429) {
      return new ConvexError(
        "Gemini is rate-limiting photo analysis right now. Wait a minute, then try the next meal again."
      );
    }

    if (caught.statusCode && caught.statusCode >= 500) {
      return new ConvexError(
        "Gemini is temporarily unavailable. The meal was not saved; try again shortly."
      );
    }
  }

  if (NoObjectGeneratedError.isInstance(caught)) {
    return new ConvexError(
      "Gemini returned an incomplete calorie estimate. Add a short food detail and try again."
    );
  }

  return new ConvexError(
    "Gemini could not return a valid calorie estimate. The meal was not saved; add any missing food details and try again."
  );
}

function validateMealRequest({
  description,
  portionGrams,
}: {
  description?: string;
  portionGrams?: number;
}) {
  if (
    typeof portionGrams === "number" &&
    (!Number.isFinite(portionGrams) ||
      portionGrams <= 0 ||
      portionGrams > MAX_REASONABLE_PORTION_GRAMS)
  ) {
    throw new ConvexError(
      `Approx grams must be between 1 and ${MAX_REASONABLE_PORTION_GRAMS}. Use food or drink weight only.`
    );
  }

  if (description && NON_FOOD_DESCRIPTION_PATTERN.test(description)) {
    throw new ConvexError(
      "This does not look like a food or drink entry. Upload a meal photo and describe only edible items."
    );
  }
}

function normalizeMealEstimate(
  estimate: MealEstimate,
  context: { description?: string; portionGrams?: number }
): SavedMealEstimate {
  const normalizedItems = estimate.items.map(normalizeMealItem);
  const totalCalories = normalizedItems.reduce(
    (sum, item) => sum + item.calories,
    0
  );
  const looksUnrecognized =
    estimate.foodName.trim().toLowerCase() === "unrecognized" ||
    normalizedItems.every(
      (item) =>
        item.calories <= 0 ||
        item.name.trim().toLowerCase() === "unrecognized"
    );

  if (totalCalories <= 0 || looksUnrecognized) {
    throw new ConvexError(
      "I could not identify food or drink in that photo. Try another meal photo or add edible food details."
    );
  }

  return {
    ...estimate,
    confidence: normalizeConfidence(estimate.confidence),
    items: normalizedItems,
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
