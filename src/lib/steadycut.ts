export type Mood = "great" | "good" | "flat" | "hard";

export type HabitIconKey = "utensils" | "dumbbell" | "droplet" | "footprints";

export type Habit = {
  id: string;
  name: string;
  iconKey: HabitIconKey;
  color: "green" | "blue" | "amber" | "violet";
  targetCadence: "daily" | "weekly";
  active: boolean;
  sortOrder: number;
};

export type CheckIn = {
  id: string;
  date: string;
  weight: number;
  note?: string;
  mood: Mood;
  completedHabitIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type CoachMessage = {
  id: string;
  date: string;
  promptSummary: string;
  insight: string;
  nextAction: string;
  createdAt: number;
};

export type Sex = "male" | "female" | "other";

export type Ancestry =
  | "south-asian"
  | "east-asian"
  | "southeast-asian"
  | "middle-eastern"
  | "european"
  | "african"
  | "latin-american"
  | "mixed"
  | "other";

export type UserProfile = {
  id?: string;
  displayName?: string;
  heightCm?: number;
  sex?: Sex;
  ancestry?: Ancestry;
  targetCalories?: number;
  targetWeightKg?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type ProfileInput = {
  displayName?: string;
  heightCm?: number;
  sex?: Sex;
  ancestry?: Ancestry;
  targetCalories?: number;
  targetWeightKg?: number;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealItem = {
  name: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
};

export type MealLog = {
  id: string;
  date: string;
  mealType: MealType;
  photoId: string;
  photoUrl?: string | null;
  status?: "estimating" | "ready";
  description?: string;
  portionGrams?: number;
  foodName: string;
  items: MealItem[];
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  confidence: number;
  assumptions: string[];
  followUpQuestion?: string;
  createdAt: number;
  updatedAt: number;
};

export type ScaleTimeOfDay = "morning" | "night";

export type ScaleLog = {
  id: string;
  date: string;
  timeOfDay: ScaleTimeOfDay;
  photoId: string;
  photoUrl?: string | null;
  weightKg?: number;
  rawReading?: string;
  confidence: number;
  needsManualReview: boolean;
  note?: string;
  createdAt: number;
};

export type DashboardData = {
  profile?: UserProfile | null;
  habits: Habit[];
  checkIns: CheckIn[];
  coachMessage?: CoachMessage | null;
  mealLogs?: MealLog[];
  scaleLogs?: ScaleLog[];
};

export type CheckInInput = {
  date: string;
  weight: number;
  note?: string;
  mood: Mood;
  completedHabitIds: string[];
};

export const DEFAULT_HABITS = [
  {
    id: "calorie-target",
    name: "Stay within calorie target",
    iconKey: "utensils",
    color: "green",
    targetCadence: "daily",
    active: true,
    sortOrder: 0,
  },
  {
    id: "strength-training",
    name: "Strength training",
    iconKey: "dumbbell",
    color: "blue",
    targetCadence: "weekly",
    active: true,
    sortOrder: 1,
  },
  {
    id: "water",
    name: "2L+ water",
    iconKey: "droplet",
    color: "amber",
    targetCadence: "daily",
    active: true,
    sortOrder: 2,
  },
  {
    id: "steps",
    name: "8k+ steps",
    iconKey: "footprints",
    color: "violet",
    targetCadence: "daily",
    active: true,
    sortOrder: 3,
  },
] satisfies Habit[];

export const moodOptions: { value: Mood; label: string }[] = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "flat", label: "Flat" },
  { value: "hard", label: "Hard" },
];

export const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export const sexOptions: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const ancestryOptions: { value: Ancestry; label: string }[] = [
  { value: "south-asian", label: "South Asian" },
  { value: "east-asian", label: "East Asian" },
  { value: "southeast-asian", label: "Southeast Asian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "european", label: "European" },
  { value: "african", label: "African" },
  { value: "latin-american", label: "Latin American" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
];

export const scaleTimeOptions: { value: ScaleTimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "night", label: "Night" },
];

export function toDateKey(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function formatDisplayDate(dateKey: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: options?.year ?? "numeric",
    ...options,
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function formatShortDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateKey}T12:00:00`));
}

export function createDemoDashboardData(today = toDateKey()): DashboardData {
  const habitIds = DEFAULT_HABITS.map((habit) => habit.id);
  const weights = [
    77.2, 77.0, 76.7, 76.6, 76.4, 76.5, 76.2, 75.8, 75.7, 75.5, 75.7,
    75.3, 75.2, 75.4, 75.2, 75.1, 74.9, 75.1, 74.9, 74.8, 74.9,
  ];
  const notes = [
    "Felt good. Solid workout.",
    "Busy day. Stuck to plan.",
    "Dinner out, stayed mindful.",
    "Good day overall.",
    "Leg day done.",
  ];

  const checkIns = weights.map((weight, index) => {
    const date = addDays(today, index - weights.length + 1);
    const missedSteps = index % 6 === 2;
    const completedHabitIds = missedSteps ? habitIds.slice(0, 3) : habitIds;

    return {
      id: `demo-${date}`,
      date,
      weight,
      note: notes[index % notes.length],
      mood: index % 7 === 3 ? "flat" : "good",
      completedHabitIds,
      createdAt: Date.now() - (weights.length - index) * 86_400_000,
      updatedAt: Date.now() - (weights.length - index) * 86_400_000,
    } satisfies CheckIn;
  });

  return {
    profile: {
      id: "demo-profile",
      displayName: "Rohit",
      heightCm: 174,
      sex: "male",
      ancestry: "south-asian",
      targetCalories: 1800,
      targetWeightKg: 72,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    habits: [...DEFAULT_HABITS],
    checkIns,
    coachMessage: {
      id: `demo-coach-${today}`,
      date: today,
      promptSummary: "Demo daily coach summary",
      insight:
        "Your trend is moving down because you keep returning to the basics. Protect the streak today instead of making the plan heavier.",
      nextAction: "Hit 2L of water today.",
      createdAt: Date.now(),
    },
    mealLogs: [
      {
        id: `demo-meal-lunch-${today}`,
        date: today,
        mealType: "lunch",
        photoId: "demo-lunch",
        status: "ready",
        foodName: "Paneer dal bowl",
        items: [
          {
            name: "Paneer dal bowl",
            calories: 620,
            proteinGrams: 31,
            carbsGrams: 68,
            fatGrams: 22,
          },
        ],
        calories: 620,
        proteinGrams: 31,
        carbsGrams: 68,
        fatGrams: 22,
        confidence: 0.78,
        assumptions: [
          "One medium bowl dal, paneer portion, and a modest rice serving.",
          "Oil level estimated as medium from the visible sheen.",
        ],
        createdAt: Date.now() - 3_600_000,
        updatedAt: Date.now() - 3_600_000,
      },
      {
        id: `demo-meal-breakfast-${today}`,
        date: today,
        mealType: "breakfast",
        photoId: "demo-breakfast",
        status: "ready",
        foodName: "Masala oats",
        items: [
          {
            name: "Masala oats",
            calories: 360,
            proteinGrams: 14,
            carbsGrams: 52,
            fatGrams: 10,
          },
        ],
        calories: 360,
        proteinGrams: 14,
        carbsGrams: 52,
        fatGrams: 10,
        confidence: 0.72,
        assumptions: ["One bowl with vegetables and light oil."],
        createdAt: Date.now() - 18_000_000,
        updatedAt: Date.now() - 18_000_000,
      },
    ],
  };
}

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
    trendData: weightTrend.points.slice(-30).map((point) => ({
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
  const points = sortedCheckIns.map((checkIn) => {
    const trendWeight =
      previousTrend == null
        ? checkIn.weight
        : alpha * checkIn.weight + (1 - alpha) * previousTrend;

    previousTrend = trendWeight;

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

function daysBetween(startDateKey: string, endDateKey: string) {
  const start = new Date(`${startDateKey}T12:00:00`).getTime();
  const end = new Date(`${endDateKey}T12:00:00`).getTime();

  return Math.max((end - start) / 86_400_000, 1);
}
