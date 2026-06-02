import { query } from "./_generated/server";
import { getUserId } from "./lib/auth";
import { getMealItems, isFailedMealEstimate } from "./mealLogs";

export const getDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    const now = Date.now();
    const [
      habits,
      profile,
      checkIns,
      coachMessages,
      mealLogs,
      scaleLogs,
      hydrationLogs,
    ] = await Promise.all([
      ctx.db
        .query("habits")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique(),
      ctx.db
        .query("checkIns")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(90),
      ctx.db
        .query("coachMessages")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(1),
      ctx.db
        .query("mealLogs")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(90),
      ctx.db
        .query("scaleLogs")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(30),
      ctx.db
        .query("hydrationLogs")
        .withIndex("by_user_date", (q) => q.eq("userId", userId))
        .order("desc")
        .take(90),
    ]);

    return {
      profile,
      habits,
      checkIns,
      coachMessage: coachMessages[0] ?? null,
      mealLogs: mealLogs
        .filter((meal) => !isFailedMealEstimate(meal, now))
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

