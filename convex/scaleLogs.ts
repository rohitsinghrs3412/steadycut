import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { action, internalMutation, mutation, query } from "./_generated/server";
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
  } catch {
    return {
      weightKg: null,
      confidence: 0,
      needsManualReview: true,
      note: "Gemini could not read this scale photo. Try a clearer photo with the digits unobstructed.",
    };
  }
}

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

