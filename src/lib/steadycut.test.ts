import { describe, expect, it } from "vitest";

import {
  getCalorieStats,
  getEwmaWeightTrend,
  getHydrationStats,
  getWeightGoalProgress,
  HYDRATION_TARGET_ML,
  type DashboardData,
  type HydrationLog,
  type MealLog,
} from "./steadycut";

const baseData: DashboardData = {
  habits: [],
  checkIns: [],
};

describe("steadycut domain helpers", () => {
  it("summarizes hydration for the selected day", () => {
    const hydrationLogs: HydrationLog[] = [
      hydrationLog({ id: "yesterday", date: "2026-05-31", volumeMl: 1000 }),
      hydrationLog({ id: "morning", createdAt: 1, volumeMl: 750 }),
      hydrationLog({ id: "latest", createdAt: 2, volumeMl: 1500 }),
    ];

    const stats = getHydrationStats(
      { ...baseData, hydrationLogs },
      "2026-06-01"
    );

    expect(stats.totalMl).toBe(2250);
    expect(stats.remainingMl).toBe(0);
    expect(stats.percent).toBe(100);
    expect(stats.isTargetMet).toBe(true);
    expect(stats.latestLog?.id).toBe("latest");
  });

  it("uses the default hydration target", () => {
    const stats = getHydrationStats(baseData, "2026-06-01");

    expect(stats.targetMl).toBe(HYDRATION_TARGET_ML);
    expect(stats.totalMl).toBe(0);
    expect(stats.isTargetMet).toBe(false);
  });

  it("summarizes today's calories and macros only", () => {
    const mealLogs: MealLog[] = [
      mealLog({ id: "today-breakfast", calories: 400, proteinGrams: 25 }),
      mealLog({ id: "today-lunch", calories: 700, carbsGrams: 80 }),
      mealLog({ id: "yesterday", date: "2026-05-31", calories: 900 }),
    ];

    const stats = getCalorieStats(
      { ...baseData, mealLogs },
      "2026-06-01",
      1000
    );

    expect(stats.consumed).toBe(1100);
    expect(stats.remaining).toBe(-100);
    expect(stats.percent).toBe(100);
    expect(stats.protein).toBe(25);
    expect(stats.carbs).toBe(80);
    expect(stats.isOnTrack).toBe(false);
    expect(stats.todaysMeals.map((meal) => meal.id)).toEqual([
      "today-breakfast",
      "today-lunch",
    ]);
  });

  it("sorts check-ins before calculating trend points", () => {
    const trend = getEwmaWeightTrend([
      checkIn({ id: "later", date: "2026-06-03", weight: 79 }),
      checkIn({ id: "earlier", date: "2026-06-01", weight: 80 }),
    ]);

    expect(trend.points.map((point) => point.date)).toEqual([
      "2026-06-01",
      "2026-06-03",
    ]);
    expect(trend.latestTrendWeight).toBeLessThan(80);
  });

  it("calculates weight-goal progress defensively", () => {
    expect(getWeightGoalProgress(80, 75, 70)).toBe(50);
    expect(getWeightGoalProgress(80, 70, 70)).toBe(100);
    expect(getWeightGoalProgress(undefined, 75, 70)).toBeNull();
  });
});

function hydrationLog({
  id,
  date = "2026-06-01",
  volumeMl,
  createdAt = 1,
}: {
  id: string;
  date?: string;
  volumeMl: number;
  createdAt?: number;
}): HydrationLog {
  return {
    id,
    date,
    beverageName: "Water",
    containerName: "Bottle",
    volumeMl,
    confidence: 1,
    assumptions: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function mealLog({
  id,
  date = "2026-06-01",
  calories,
  proteinGrams,
  carbsGrams,
}: {
  id: string;
  date?: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
}): MealLog {
  return {
    id,
    date,
    mealType: "lunch",
    photoId: `${id}-photo`,
    foodName: id,
    items: [],
    calories,
    proteinGrams,
    carbsGrams,
    confidence: 1,
    assumptions: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

function checkIn({
  id,
  date,
  weight,
}: {
  id: string;
  date: string;
  weight: number;
}) {
  return {
    id,
    date,
    weight,
    mood: "good" as const,
    completedHabitIds: [],
    createdAt: 1,
    updatedAt: 1,
  };
}
