import {
  DashboardData,
  CheckIn,
  MealLog,
  MealItem,
  Ancestry,
} from "./types";
import {
  MAX_REASONABLE_MEAL_PORTION_GRAMS,
  HYDRATION_TARGET_ML,
  NON_FOOD_DESCRIPTION_PATTERN,
} from "./constants";
import {
  toDateKey,
  addDays,
  formatShortDate,
  daysBetween,
} from "./dates";

export function getSortedCheckIns(checkIns: CheckIn[]) {
  return [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
}

export function getTodayCheckIn(checkIns: CheckIn[], today = toDateKey()) {
  return checkIns.find((checkIn) => checkIn.date === today) ?? null;
}

export function getDashboardStats(data: DashboardData, today = toDateKey()) {
  const activeHabits = data.habits
    .filter((habit) => habit.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const sortedCheckIns = getSortedCheckIns(data.checkIns);
  const latest = sortedCheckIns.at(-1) ?? null;
  const first = sortedCheckIns[0] ?? null;
  const todayCheckIn = getTodayCheckIn(sortedCheckIns, today);
  const latestCompletedCount = todayCheckIn?.completedHabitIds.length ?? 0;
  const delta = latest && first ? latest.weight - first.weight : 0;
  const weekKeys = Array.from({ length: 7 }, (_, index) =>
    addDays(today, index - 6)
  );
  const checkInDateSet = new Set(sortedCheckIns.map((checkIn) => checkIn.date));
  const streak = countStreak(checkInDateSet, today);
  const checkInsThisWeek = weekKeys.filter((date) => checkInDateSet.has(date)).length;
  const monthStart = addDays(today, -29);
  const checkInsThisMonth = sortedCheckIns.filter(
    (checkIn) => checkIn.date >= monthStart && checkIn.date <= today
  ).length;
  const weightTrend = getEwmaWeightTrend(sortedCheckIns);

  return {
    activeHabits,
    sortedCheckIns,
    latest,
    first,
    todayCheckIn,
    latestCompletedCount,
    delta,
    weekKeys,
    checkInDateSet,
    streak,
    checkInsThisWeek,
    checkInsThisMonth,
    weightTrend,
    trendData: weightTrend.points.map((point) => ({
      date: point.date,
      label: formatShortDate(point.date),
      weight: point.weight,
      trendWeight: point.trendWeight,
    })),
  };
}

export function getEwmaWeightTrend(checkIns: CheckIn[], windowDays = 7) {
  const sortedCheckIns = getSortedCheckIns(checkIns);
  const alpha = 2 / (windowDays + 1);
  let previousTrend: number | null = null;
  let previousDate: string | null = null;
  const points = sortedCheckIns.map((checkIn) => {
    let adjustedAlpha = alpha;
    if (previousTrend !== null && previousDate !== null) {
      const d = daysBetween(previousDate, checkIn.date);
      const days = Math.max(1, d);
      adjustedAlpha = 1 - Math.pow(1 - alpha, days);
    }

    const trendWeight =
      previousTrend == null
        ? checkIn.weight
        : adjustedAlpha * checkIn.weight + (1 - adjustedAlpha) * previousTrend;

    previousTrend = trendWeight;
    previousDate = checkIn.date;

    return {
      date: checkIn.date,
      weight: checkIn.weight,
      trendWeight,
    };
  });
  const latest = points.at(-1) ?? null;
  const previous = latest
    ? [...points]
        .reverse()
        .find((point) => daysBetween(point.date, latest.date) >= windowDays)
    : null;
  const weeklySpeed =
    latest && previous
      ? ((latest.trendWeight - previous.trendWeight) /
          daysBetween(previous.date, latest.date)) *
        7
      : null;

  return {
    points,
    latestTrendWeight: latest?.trendWeight ?? null,
    weeklySpeed,
  };
}

export function getCalorieStats(
  data: DashboardData,
  today = toDateKey(),
  targetCalories = data.profile?.targetCalories ?? 1800
) {
  const todaysMeals = (data.mealLogs ?? []).filter((meal) => meal.date === today);
  const consumed = todaysMeals.reduce((total, meal) => total + meal.calories, 0);
  const protein = todaysMeals.reduce(
    (total, meal) => total + (meal.proteinGrams ?? 0),
    0
  );
  const carbs = todaysMeals.reduce(
    (total, meal) => total + (meal.carbsGrams ?? 0),
    0
  );
  const fat = todaysMeals.reduce(
    (total, meal) => total + (meal.fatGrams ?? 0),
    0
  );
  const remaining = targetCalories - consumed;
  const percent = targetCalories > 0 ? Math.min((consumed / targetCalories) * 100, 100) : 0;

  return {
    todaysMeals,
    targetCalories,
    consumed,
    remaining,
    percent,
    protein,
    carbs,
    fat,
    isOnTrack: remaining >= 0,
  };
}

export function getHydrationStats(
  data: DashboardData,
  today = toDateKey(),
  targetMl = HYDRATION_TARGET_ML
) {
  const todaysLogs = (data.hydrationLogs ?? []).filter(
    (log) => log.date === today
  );
  const totalMl = todaysLogs.reduce((total, log) => total + log.volumeMl, 0);
  const percent = targetMl > 0 ? Math.min((totalMl / targetMl) * 100, 100) : 0;
  const remainingMl = Math.max(targetMl - totalMl, 0);
  const latestLog = [...todaysLogs].sort((a, b) => b.createdAt - a.createdAt)[0];

  return {
    todaysLogs,
    totalMl,
    targetMl,
    remainingMl,
    percent,
    latestLog,
    isTargetMet: totalMl >= targetMl,
  };
}

export function formatHydrationVolume(valueMl: number) {
  if (valueMl >= 1000) {
    const liters = valueMl / 1000;
    return `${Number.isInteger(liters) ? liters.toFixed(0) : liters.toFixed(1)}L`;
  }

  return `${Math.round(valueMl)} ml`;
}

export function getFallbackMealItems(meal: MealLog): MealItem[] {
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

export function parseMealPortionGrams(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getMealInputError({
  description,
  portionGrams,
  portionGramsField,
}: {
  description: string;
  portionGrams?: number;
  portionGramsField: string;
}) {
  if (portionGramsField.trim()) {
    if (
      typeof portionGrams !== "number" ||
      portionGrams <= 0 ||
      portionGrams > MAX_REASONABLE_MEAL_PORTION_GRAMS
    ) {
      return `Approx grams must be between 1 and ${MAX_REASONABLE_MEAL_PORTION_GRAMS}. Use food or drink weight only.`;
    }
  }

  if (NON_FOOD_DESCRIPTION_PATTERN.test(description)) {
    return "This does not look like a food or drink entry. Upload a meal photo and describe only edible items.";
  }

  return null;
}

export function formatWeight(weight?: number) {
  return weight == null ? "--" : `${weight.toFixed(1)} kg`;
}

export function formatWeeklyTrendSpeed(value: number | null, suffix = "") {
  if (value == null) {
    return "-- / wk";
  }

  const prefix = value <= 0 ? "-" : "+";

  return `${prefix}${Math.abs(value).toFixed(2)} kg/wk${suffix}`;
}

export function getWeightGoalProgress(
  startWeight?: number,
  currentWeight?: number,
  targetWeight?: number
) {
  if (startWeight == null || currentWeight == null || targetWeight == null) {
    return null;
  }

  const totalDistance = startWeight - targetWeight;

  if (totalDistance <= 0) {
    return currentWeight <= targetWeight ? 100 : 0;
  }

  return Math.max(
    0,
    Math.min(((startWeight - currentWeight) / totalDistance) * 100, 100)
  );
}

export function getWeightGoalSummary(
  startWeight?: number,
  currentWeight?: number,
  targetWeight?: number
) {
  if (targetWeight == null) {
    return "Set a goal weight in settings.";
  }

  if (currentWeight == null || startWeight == null) {
    return "Log a weight check-in to start progress tracking.";
  }

  const remaining = currentWeight - targetWeight;

  if (remaining <= 0) {
    return "You are at or below your goal weight.";
  }

  const lost = startWeight - currentWeight;

  if (lost <= 0) {
    return `${remaining.toFixed(1)} kg left from your current weight.`;
  }

  return `${lost.toFixed(1)} kg down, ${remaining.toFixed(1)} kg left.`;
}

export function calculateBmi(weightKg?: number, heightCm?: number) {
  if (!weightKg || !heightCm) {
    return null;
  }

  const heightMeters = heightCm / 100;

  if (heightMeters <= 0) {
    return null;
  }

  return weightKg / (heightMeters * heightMeters);
}

export function getBmiSummary(bmi: number | null, ancestry?: Ancestry) {
  if (bmi == null) {
    return "Add weight and height";
  }

  if (
    ancestry === "south-asian" ||
    ancestry === "east-asian" ||
    ancestry === "southeast-asian"
  ) {
    if (bmi < 18.5) return "Below common range";
    if (bmi < 23) return "In common range";
    if (bmi < 27.5) return "Above common range";
    return "High BMI";
  }

  if (bmi < 18.5) return "Below common range";
  if (bmi < 25) return "In common range";
  if (bmi < 30) return "Above common range";
  return "High BMI";
}

export function getPreviousWeightChange(checkIn: CheckIn, allCheckIns: CheckIn[]) {
  const sorted = getSortedCheckIns(allCheckIns);
  const index = sorted.findIndex((item) => item.id === checkIn.id);
  const previous = index > 0 ? sorted[index - 1] : null;

  if (!previous) {
    return null;
  }

  return checkIn.weight - previous.weight;
}

function countStreak(dateSet: Set<string>, today: string) {
  let cursor = today;
  let count = 0;

  while (dateSet.has(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}
