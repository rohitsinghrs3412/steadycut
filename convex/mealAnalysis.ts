"use node";

import { google } from "@ai-sdk/google";
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
} from "ai";
import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { action } from "./_generated/server";
import { KNOWN_FOOD_ESTIMATES } from "./ai/knownFoodEstimates";
import {
  buildMealPrompt,
  DESCRIPTION_FALLBACK_MODELS,
  GEMINI_MAX_OUTPUT_TOKENS,
  GEMINI_MAX_RETRIES,
  GEMINI_TIMEOUT_MS,
  MEAL_ANALYSIS_SYSTEM,
  PRIMARY_GEMINI_MODEL,
  type MealEstimateSource,
} from "./ai/mealPrompt";
import { getUserId } from "./lib/auth";
import { mealTypeValidator } from "./schema";

const MAX_REASONABLE_PORTION_GRAMS = 5000;
const MAX_DESCRIPTION_CHARS = 800;
const MAX_MEAL_PHOTO_BYTES = 8 * 1024 * 1024;
const NON_FOOD_DESCRIPTION_PATTERN =
  /\b(human|human being|person|people|man|woman|boy|girl|child|face|selfie|body)\b/i;
const calorieNumberSchema = z.coerce.number();

const mealItemSchema = z.object({
  name: z.string().min(1).max(250),
  calories: calorieNumberSchema.min(0).max(50000),
  proteinGrams: calorieNumberSchema.min(0).max(2000).nullable().optional(),
  carbsGrams: calorieNumberSchema.min(0).max(5000).nullable().optional(),
  fatGrams: calorieNumberSchema.min(0).max(5000).nullable().optional(),
  portionGrams: z
    .coerce.number()
    .min(0)
    .max(MAX_REASONABLE_PORTION_GRAMS)
    .nullable()
    .optional(),
});

const mealEstimateSchema = z.object({
  foodName: z
    .string()
    .min(1)
    .max(250)
    .describe("Short display name for the overall meal."),
  items: z
    .array(mealItemSchema)
    .min(1)
    .max(20)
    .describe("Separate visible meal items with kcal and macro estimates."),
  confidence: z
    .coerce.number()
    .min(0)
    .max(100)
    .nullable()
    .optional()
    .describe(
      "Confidence from 0.05 to 1. If using a 1-10 or 1-100 scale, the server will normalize it."
    ),
  assumptions: z.array(z.string().max(500)).max(15).optional(),
  followUpQuestion: z.string().max(500).nullable().optional(),
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
type SavedMealEstimate = {
  foodName: string;
  items: SavedMealItem[];
  confidence: number;
  assumptions: string[];
  followUpQuestion?: string;
};
type ErrorSummary = {
  name?: string;
  message?: string;
  statusCode?: number;
  finishReason?: string;
  text?: string;
  reason?: string;
  lastError?: ErrorSummary;
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

      if (blob.size > MAX_MEAL_PHOTO_BYTES) {
        throw new ConvexError(
          "That photo is too large to analyze reliably. Try a smaller or clearer meal photo."
        );
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
  const knownFoodFallback = estimateMealFromKnownFoodDescription({
    description,
    portionGrams,
    sourceError: new Error("Gemini API is not configured or request failed."),
  });

  if (knownFoodFallback) {
    return knownFoodFallback;
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "Gemini is not configured yet. Add the Google AI Studio API key, then try this meal again."
    );
  }

  try {
    return await generateMealEstimate({
      image,
      mediaType,
      mealType,
      description,
      portionGrams,
      source: "photo",
    });
  } catch (caught) {
    const descriptionFallback = await tryEstimateMealFromDescription(caught, {
      mealType,
      description,
      portionGrams,
    });

    if (descriptionFallback) {
      return descriptionFallback;
    }

    console.error("Meal analysis failed", caught);
    throw getClientSafeMealAnalysisError(caught);
  }
}

async function generateMealEstimate({
  image,
  mediaType,
  mealType,
  description,
  portionGrams,
  source,
  modelId = PRIMARY_GEMINI_MODEL,
}: {
  image?: ArrayBuffer;
  mediaType?: string;
  mealType: string;
  description?: string;
  portionGrams?: number;
  source: MealEstimateSource;
  modelId?: string;
}): Promise<SavedMealEstimate> {
  const promptText = buildMealPrompt({
    mealType,
    description,
    portionGrams,
    source,
  });
  const content = image
    ? [
        {
          type: "text" as const,
          text: promptText,
        },
        {
          type: "image" as const,
          image,
          mediaType: mediaType || "image/jpeg",
        },
      ]
    : promptText;

  const { output } = await generateText({
    model: google(modelId),
    maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    maxRetries: GEMINI_MAX_RETRIES,
    temperature: 0.1,
    timeout: { totalMs: GEMINI_TIMEOUT_MS },
    output: Output.object({ schema: mealEstimateSchema }),
    system: MEAL_ANALYSIS_SYSTEM,
    messages: [
      {
        role: "user",
        content,
      },
    ],
  });

  return normalizeMealEstimate(output, { description, portionGrams });
}

async function tryEstimateMealFromDescription(
  caught: unknown,
  context: {
    mealType: string;
    description?: string;
    portionGrams?: number;
  }
) {
  if (!shouldTryDescriptionFallback(caught, context.description)) {
    return null;
  }

  console.warn(
    "Meal photo analysis failed; retrying from food details only",
    getErrorSummary(caught)
  );

  for (const modelId of DESCRIPTION_FALLBACK_MODELS) {
    try {
      return await generateMealEstimate({
        ...context,
        source: "description",
        modelId,
      });
    } catch (fallbackError) {
      console.warn("Meal description fallback failed", {
        modelId,
        error: getErrorSummary(fallbackError),
      });
    }
  }

  return null;
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

  if (NoOutputGeneratedError.isInstance(caught) || RetryError.isInstance(caught)) {
    return new ConvexError(
      "Gemini could not finish this estimate right now. The meal was not saved; try again in a minute."
    );
  }

  if (NoObjectGeneratedError.isInstance(caught)) {
    return new ConvexError(
      "Gemini returned an incomplete calorie estimate. Try a clearer photo or a shorter food detail."
    );
  }

  return new ConvexError(
    "Gemini could not return a valid calorie estimate. The meal was not saved; try a clearer photo or shorter food details."
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

  if (description && description.trim().length > MAX_DESCRIPTION_CHARS) {
    throw new ConvexError(
      `Food details must be ${MAX_DESCRIPTION_CHARS} characters or less.`
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
  const foodName =
    estimate.foodName.trim() ||
    (normalizedItems.length > 1
      ? `${normalizedItems[0]?.name ?? "Meal"} + ${normalizedItems.length - 1}`
      : normalizedItems[0]?.name ?? "Meal");
  const totalCalories = normalizedItems.reduce(
    (sum, item) => sum + item.calories,
    0
  );
  const looksUnrecognized =
    foodName.toLowerCase() === "unrecognized" ||
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
    foodName,
    confidence: normalizeConfidence(estimate.confidence ?? 0.5),
    assumptions: normalizeAssumptions(estimate.assumptions, context),
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
    name: item.name.trim() || "Meal item",
    calories: Math.max(Math.round(item.calories), 0),
    proteinGrams: item.proteinGrams ?? undefined,
    carbsGrams: item.carbsGrams ?? undefined,
    fatGrams: item.fatGrams ?? undefined,
    portionGrams: item.portionGrams ?? undefined,
  };
}

function estimateMealFromKnownFoodDescription({
  description,
  portionGrams,
  sourceError,
}: {
  description?: string;
  portionGrams?: number;
  sourceError: unknown;
}): SavedMealEstimate | null {
  if (!hasUsableFoodDescription(description)) {
    return null;
  }

  const normalizedDescription = description?.trim() ?? "";
  const food = KNOWN_FOOD_ESTIMATES.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(normalizedDescription))
  );

  if (!food) {
    return null;
  }

  const grams =
    normalizeFallbackPortionGrams(portionGrams) ??
    parsePortionFromDescription(normalizedDescription) ??
    food.defaultPortionGrams;

  if (!grams) {
    return null;
  }

  const multiplier = grams / 100;
  const calories = Math.max(Math.round(food.caloriesPer100g * multiplier), 1);

  console.warn("Using standard nutrition fallback for meal estimate", {
    foodName: food.name,
    portionGrams: grams,
    sourceError: getErrorSummary(sourceError),
  });

  return {
    foodName: food.name,
    confidence: 0.58,
    assumptions: [
      "Gemini was unavailable, so this used a standard nutrition estimate.",
      `Estimated from food details: ${normalizedDescription}`,
      `Used portion: ${grams} g.`,
    ],
    items: [
      {
        name: food.name,
        calories,
        proteinGrams: roundMacro(food.proteinPer100g * multiplier),
        carbsGrams: roundMacro(food.carbsPer100g * multiplier),
        fatGrams: roundMacro(food.fatPer100g * multiplier),
        portionGrams: grams,
      },
    ],
  };
}

function normalizeFallbackPortionGrams(portionGrams?: number) {
  if (
    typeof portionGrams === "number" &&
    Number.isFinite(portionGrams) &&
    portionGrams > 0 &&
    portionGrams <= MAX_REASONABLE_PORTION_GRAMS
  ) {
    return Math.round(portionGrams);
  }

  return undefined;
}

function parsePortionFromDescription(description: string) {
  const portionMatch = description.match(
    /\b(\d+(?:\.\d+)?)\s*(g|gm|gms|gram|grams|ml|milliliter|milliliters)\b/i
  );

  if (!portionMatch) {
    return undefined;
  }

  const portion = Number(portionMatch[1]);

  if (
    !Number.isFinite(portion) ||
    portion <= 0 ||
    portion > MAX_REASONABLE_PORTION_GRAMS
  ) {
    return undefined;
  }

  return Math.round(portion);
}

function roundMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function normalizeAssumptions(
  assumptions: string[] | undefined,
  context: { description?: string; portionGrams?: number }
) {
  const normalized = (assumptions ?? [])
    .map((assumption) => assumption.trim())
    .filter(Boolean)
    .slice(0, 15);

  if (normalized.length > 0) {
    return normalized;
  }

  const fallback = [];

  if (context.description?.trim()) {
    fallback.push(`Estimated from food details: ${context.description.trim()}`);
  }

  if (typeof context.portionGrams === "number") {
    fallback.push(`Used the supplied portion: ${context.portionGrams} g.`);
  }

  return fallback.length > 0
    ? fallback
    : ["Estimated from the meal photo and available details."];
}

function shouldTryDescriptionFallback(caught: unknown, description?: string) {
  if (!hasUsableFoodDescription(description)) {
    return false;
  }

  if (NoObjectGeneratedError.isInstance(caught)) {
    return true;
  }

  if (NoOutputGeneratedError.isInstance(caught) || RetryError.isInstance(caught)) {
    return true;
  }

  if (caught instanceof ConvexError) {
    return true;
  }

  if (APICallError.isInstance(caught)) {
    return caught.statusCode !== 429;
  }

  return false;
}

function hasUsableFoodDescription(description?: string) {
  const normalized = description?.trim();

  return Boolean(
    normalized &&
      normalized.length >= 2 &&
      /[a-z0-9]/i.test(normalized) &&
      !NON_FOOD_DESCRIPTION_PATTERN.test(normalized)
  );
}

function getErrorSummary(error: unknown): ErrorSummary {
  if (NoObjectGeneratedError.isInstance(error)) {
    return {
      name: "NoObjectGeneratedError",
      finishReason: error.finishReason,
      text: error.text?.slice(0, 240),
    };
  }

  if (NoOutputGeneratedError.isInstance(error)) {
    return {
      name: "NoOutputGeneratedError",
      message: error.message,
    };
  }

  if (RetryError.isInstance(error)) {
    return {
      name: "RetryError",
      reason: error.reason,
      message: error.message,
      lastError: getErrorSummary(error.lastError),
    };
  }

  if (APICallError.isInstance(error)) {
    return {
      name: "APICallError",
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };
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
