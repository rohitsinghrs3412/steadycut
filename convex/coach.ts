import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { anyApi } from "convex/server";
import { v } from "convex/values";
import { z } from "zod";

import { action, internalMutation } from "./_generated/server";
import { getUserId } from "./lib/auth";

type CoachDashboard = {
  habits: Array<{
    name: string;
    active: boolean;
  }>;
  checkIns: Array<{
    date: string;
    weight: number;
    mood: string;
    completedHabitIds: unknown[];
    note?: string;
  }>;
  mealLogs?: Array<{
    date: string;
    mealType: string;
    foodName: string;
    calories: number;
    confidence: number;
  }>;
  scaleLogs?: Array<{
    date: string;
    timeOfDay: string;
    weightKg?: number;
    confidence: number;
    needsManualReview: boolean;
  }>;
};

type SavedCoachMessage = {
  id: string;
  date: string;
  promptSummary: string;
  insight: string;
  nextAction: string;
  createdAt: number;
};

const coachOutputSchema = z.object({
  insight: z.string().min(20).max(420),
  nextAction: z.string().min(5).max(140),
});

export const generateDailyCoach = action({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args): Promise<SavedCoachMessage> => {
    const userId = await getUserId(ctx);
    const dashboard = (await ctx.runQuery(
      anyApi.dashboard.getDashboard,
      {}
    )) as CoachDashboard;
    const latestCheckIns = dashboard.checkIns.slice(0, 14);
    const promptSummary = JSON.stringify({
      date: args.date,
      habits: dashboard.habits.map((habit) => ({
        name: habit.name,
        active: habit.active,
      })),
      latestCheckIns: latestCheckIns.map((checkIn) => ({
        date: checkIn.date,
        weightKg: checkIn.weight,
        mood: checkIn.mood,
        completedHabitCount: checkIn.completedHabitIds.length,
        note: checkIn.note,
      })),
      recentMeals: (dashboard.mealLogs ?? []).slice(0, 10).map((meal) => ({
        date: meal.date,
        mealType: meal.mealType,
        foodName: meal.foodName,
        calories: meal.calories,
        confidence: meal.confidence,
      })),
      recentScaleReadings: (dashboard.scaleLogs ?? [])
        .filter((log) => log.weightKg)
        .slice(0, 10)
        .map((log) => ({
          date: log.date,
          timeOfDay: log.timeOfDay,
          weightKg: log.weightKg,
          confidence: log.confidence,
        })),
    });

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return (await ctx.runMutation(anyApi.coach.saveCoachMessage, {
        userId,
        date: args.date,
        promptSummary,
        insight:
          "Your app is ready for live coaching once the Gemini API key is added. For today, protect the basics and log the check-in even if it is not perfect.",
        nextAction: "Finish today's check-in and choose one habit to protect.",
      })) as SavedCoachMessage;
    }

    const { output } = await generateText({
      model: google("gemini-2.5-flash"),
      output: Output.object({ schema: coachOutputSchema }),
      system:
        "You are a kind but direct weight-loss consistency coach for a private Indian user tracking weight in kg and food in kcal/grams. Give behavioral support only. Do not provide medical advice, diagnoses, extreme dieting instructions, or shame-based language. Keep advice practical, brief, and focused on the next small action.",
      prompt: `Use this private user data to write today's coaching insight and next action:\n${promptSummary}`,
    });

    return (await ctx.runMutation(anyApi.coach.saveCoachMessage, {
      userId,
      date: args.date,
      promptSummary,
      insight: output.insight,
      nextAction: output.nextAction,
    })) as SavedCoachMessage;
  },
});

export const saveCoachMessage = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    promptSummary: v.string(),
    insight: v.string(),
    nextAction: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("coachMessages")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();

    if (existing) {
      await ctx.db.replace(existing._id, {
        ...args,
        createdAt: Date.now(),
      });
      return {
        id: existing._id,
        date: args.date,
        promptSummary: args.promptSummary,
        insight: args.insight,
        nextAction: args.nextAction,
        createdAt: Date.now(),
      };
    }

    const createdAt = Date.now();
    const id = await ctx.db.insert("coachMessages", {
      ...args,
      createdAt,
    });

    return {
      id,
      date: args.date,
      promptSummary: args.promptSummary,
      insight: args.insight,
      nextAction: args.nextAction,
      createdAt,
    };
  },
});
