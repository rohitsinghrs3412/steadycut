import { query } from "./_generated/server";
import { getUserId } from "./lib/auth";

function isFailedMealEstimate(meal: {
  foodName: string;
  calories: number;
  confidence: number;
  status?: "estimating" | "ready";
}) {
  if (meal.status === "estimating") {
    return false;
  }

  const foodName = meal.foodName.trim().toLowerCase();

  return (
    meal.calories <= 0 ||
    meal.confidence <= 0 ||
    foodName === "could not analyze meal" ||
    foodName === "gemini setup needed"
  );
}

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const habits = await ctx.db
      .query("habits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(90);
    const coachMessages = await ctx.db
      .query("coachMessages")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    const mealLogs = await ctx.db
      .query("mealLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(90);
    const scaleLogs = await ctx.db
      .query("scaleLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);

    return {
      profile,
      habits,
      checkIns,
      coachMessage: coachMessages[0] ?? null,
    mealLogs: mealLogs
        .filter((meal) => !isFailedMealEstimate(meal))
        .slice(0, 30)
        .map((meal) => ({
          ...meal,
          items: getMealItems(meal),
        })),
      scaleLogs,
    };
  },
});

function getMealItems(meal: {
  foodName: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
  items?: Array<{
    name: string;
    calories: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
    portionGrams?: number;
  }>;
}) {
  if (meal.items) {
    return meal.items;
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
