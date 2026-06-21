import { DashboardData, CheckIn } from "./types";
import { DEFAULT_HABITS } from "./constants";
import { toDateKey, addDays } from "./dates";

export function createDemoDashboardData(today = toDateKey()): DashboardData {
  const habitIds = DEFAULT_HABITS.map((habit) => habit.id);
  const weights = [
    80.5, 80.2, 80.4, 79.9, 79.7, 79.8, 79.5, 79.2, 79.4, 79.1, 78.8,
    79.0, 78.6, 78.5, 78.7, 78.3, 78.0, 78.2, 77.9, 77.6, 77.8, 77.5,
    77.2, 77.0, 76.7, 76.6, 76.4, 76.5, 76.2, 75.8, 75.7, 75.5, 75.7,
    75.3, 75.2, 75.4, 75.2, 75.1, 74.9, 75.1, 74.9, 74.8, 74.9, 74.6,
    74.4, 74.5, 74.2, 73.9, 74.1, 73.8
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
    hydrationLogs: [
      {
        id: `demo-hydration-morning-${today}`,
        date: today,
        photoId: "demo-water-bottle",
        beverageName: "Water",
        containerName: "750 ml steel bottle",
        volumeMl: 650,
        confidence: 0.82,
        assumptions: [
          "Bottle appears mostly full with a small air gap.",
          "Estimated from a common 750 ml bottle size.",
        ],
        createdAt: Date.now() - 20_000_000,
        updatedAt: Date.now() - 20_000_000,
      },
      {
        id: `demo-hydration-coffee-${today}`,
        date: today,
        photoId: "demo-coffee-mug",
        beverageName: "Coffee",
        containerName: "Ceramic mug",
        volumeMl: 280,
        confidence: 0.7,
        assumptions: ["Mug looks close to a standard 300 ml serving."],
        createdAt: Date.now() - 11_000_000,
        updatedAt: Date.now() - 11_000_000,
      },
      {
        id: `demo-hydration-evening-${today}`,
        date: today,
        photoId: "demo-glass-water",
        beverageName: "Water",
        containerName: "Tall glass",
        volumeMl: 350,
        confidence: 0.76,
        assumptions: ["Glass appears nearly full."],
        createdAt: Date.now() - 2_700_000,
        updatedAt: Date.now() - 2_700_000,
      },
    ],
  };
}
