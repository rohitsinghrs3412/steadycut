"use node";

import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { anyApi } from "convex/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { action } from "./_generated/server";
import { getUserId } from "./lib/auth";

const MAX_BEVERAGE_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_CONTEXT_CHARS = 500;

const hydrationEstimateSchema = z.object({
  beverageName: z
    .string()
    .min(1)
    .max(80)
    .describe("Short drink name such as water, black coffee, tea, or soda."),
  containerName: z
    .string()
    .min(1)
    .max(120)
    .describe("Short container description such as steel tumbler or 1L bottle."),
  volumeMl: z
    .coerce.number()
    .min(30)
    .max(5000)
    .nullable()
    .describe("Estimated visible beverage volume in milliliters."),
  confidence: z.coerce.number().min(0).max(100).nullable().optional(),
  assumptions: z.array(z.string().max(220)).max(8).optional(),
});

type HydrationEstimate = z.infer<typeof hydrationEstimateSchema>;

export const analyzeHydrationPhoto = action({
  args: {
    date: v.string(),
    photoId: v.id("_storage"),
    context: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    validateHydrationRequest(args.context);

    const blob = await ctx.storage.get(args.photoId);

    if (!blob) {
      throw new ConvexError("Uploaded beverage photo could not be found.");
    }

    if (blob.size > MAX_BEVERAGE_PHOTO_BYTES) {
      throw new ConvexError(
        "That photo is too large to analyze reliably. Try a smaller or clearer beverage photo."
      );
    }

    const image = await blob.arrayBuffer();
    const mediaType = blob.type || "image/jpeg";
    const estimate = await estimateHydration({
      context: args.context,
      image,
      mediaType,
    });

    return await ctx.runMutation(anyApi.hydrationLogs.saveHydrationLog, {
      userId,
      date: args.date,
      photoId: args.photoId,
      ...estimate,
    });
  },
});

async function estimateHydration({
  context,
  image,
  mediaType,
}: {
  context?: string;
  image: ArrayBuffer;
  mediaType: string;
}) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new ConvexError(
      "Gemini is not configured yet. Add the Google AI Studio API key, then try this beverage photo again."
    );
  }

  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      maxOutputTokens: 700,
      maxRetries: 2,
      temperature: 0.05,
      output: Output.object({ schema: hydrationEstimateSchema }),
      system:
        "You estimate beverage volume from photos for a private habit tracker. Identify the drink and container, estimate the visible liquid volume in milliliters, and keep assumptions concrete. Count water, coffee, tea, and other drinks as beverage volume. Do not provide medical advice, hydration prescriptions, or certainty beyond the image evidence.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `User context: ${context?.trim() || "not provided"}`,
                "Estimate the volume currently in the visible bottle, glass, cup, tumbler, or mug.",
                "If the fill line is unclear, return a conservative estimate and explain the assumption.",
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

    return normalizeHydrationEstimate(output, context);
  } catch (error) {
    if (error instanceof ConvexError) {
      throw error;
    }

    console.error("Gemini hydration estimate action error:", error);
    throw new ConvexError(
      "Gemini could not estimate that beverage volume. Try a clearer photo with the whole container visible."
    );
  }
}

function validateHydrationRequest(context?: string) {
  if (context && context.trim().length > MAX_CONTEXT_CHARS) {
    throw new ConvexError(
      `Beverage details must be ${MAX_CONTEXT_CHARS} characters or less.`
    );
  }
}

function normalizeHydrationEstimate(
  estimate: HydrationEstimate,
  context?: string
) {
  if (!estimate.volumeMl || estimate.volumeMl <= 0) {
    throw new ConvexError(
      "I could not identify a beverage volume in that photo. Try another photo with the container and fill line visible."
    );
  }

  const normalizedConfidence = normalizeConfidence(estimate.confidence ?? 0.55);
  const assumptions = normalizeAssumptions(estimate.assumptions, context);

  return {
    beverageName: estimate.beverageName.trim() || "Beverage",
    containerName: estimate.containerName.trim() || "Container",
    volumeMl: Math.round(estimate.volumeMl),
    confidence: normalizedConfidence,
    assumptions,
  };
}

function normalizeConfidence(confidence: number) {
  const normalized =
    confidence > 10 ? confidence / 100 : confidence > 1 ? confidence / 10 : confidence;

  return Math.min(Math.max(normalized, 0.05), 1);
}

function normalizeAssumptions(assumptions?: string[], context?: string) {
  const normalized = (assumptions ?? [])
    .map((assumption) => assumption.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (normalized.length > 0) {
    return normalized;
  }

  if (context?.trim()) {
    return [`Used beverage details: ${context.trim()}`];
  }

  return ["Estimated from the visible container size and fill level."];
}
