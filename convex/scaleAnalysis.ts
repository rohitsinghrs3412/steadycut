"use node";

import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { action } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { scaleTimeOfDayValidator } from "./schema";

const scaleReadingSchema = z.object({
  weightKg: z.number().min(20).max(300).nullable(),
  rawReading: z.string().min(1).max(40).optional(),
  confidence: z.number().min(0).max(1),
  needsManualReview: z.boolean(),
  note: z.string().min(3).max(160).optional(),
});

type ScaleReading = z.infer<typeof scaleReadingSchema>;

export const analyzeScalePhoto = action({
  args: {
    date: v.string(),
    timeOfDay: scaleTimeOfDayValidator,
    photoId: v.id("_storage"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    const blob = await ctx.storage.get(args.photoId);

    if (!blob) {
      throw new Error("Uploaded scale photo could not be found.");
    }

    const image = await blob.arrayBuffer();
    const mediaType = blob.type || "image/jpeg";
    const reading = await readScale({
      image,
      mediaType,
      timeOfDay: args.timeOfDay,
      note: args.note,
    });

    return await ctx.runMutation(anyApi.scaleLogs.saveScaleLog, {
      userId,
      date: args.date,
      timeOfDay: args.timeOfDay,
      photoId: args.photoId,
      weightKg: reading.weightKg ?? undefined,
      rawReading: reading.rawReading,
      confidence: reading.confidence,
      needsManualReview: reading.needsManualReview,
      note: args.note ?? reading.note,
    });
  },
});

async function readScale({
  image,
  mediaType,
  timeOfDay,
  note,
}: {
  image: ArrayBuffer;
  mediaType: string;
  timeOfDay: string;
  note?: string;
}): Promise<ScaleReading> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return {
      weightKg: null,
      confidence: 0,
      needsManualReview: true,
      note: "The Gemini API key is missing, so the scale reading was not analyzed.",
    };
  }

  try {
    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: scaleReadingSchema }),
      system:
        "You read weighing-scale photos for a private Indian user. Extract only the displayed body weight in kilograms. If the display is unclear, feet obscure digits, units are not kg, or multiple numbers appear, set weightKg to null and needsManualReview to true. Do not give medical advice.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: [
                `Weigh-in time: ${timeOfDay}`,
                `User note: ${note?.trim() || "not provided"}`,
                "Read the scale display. Return kg as a decimal number when clear.",
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

    return output;
  } catch (error) {
    console.error("Gemini scale reading action error:", error);
    return {
      weightKg: null,
      confidence: 0,
      needsManualReview: true,
      note: "Gemini could not read this scale photo. Try a clearer photo with the digits unobstructed.",
    };
  }
}
