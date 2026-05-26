import { query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { getMealItems, isFailedMealEstimate } from "./mealLogs";

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
    const hydrationLogs = await ctx.db
      .query("hydrationLogs")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(90);

    return {
      profile,
      habits,
      checkIns,
      coachMessage: coachMessages[0] ?? null,
      mealLogs: mealLogs
        .filter((meal) => !isFailedMealEstimate(meal, Date.now()))
        .slice(0, 30)
        .map((meal) => ({
          ...meal,
          items: getMealItems(meal),
        })),
      scaleLogs,
      hydrationLogs,
    };
  },
});


