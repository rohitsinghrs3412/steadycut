"use client";

import { useEffect } from "react";
import { useAction, useMutation } from "convex/react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AppLoadingPage } from "@/components/steadycut/app-loading-page";
import { DashboardScreen } from "@/components/steadycut/dashboard-screen";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import type {
  CheckInInput,
  CoachMessage,
  DashboardData,
  MealLog,
  MealType,
  ScaleTimeOfDay,
  UserProfile,
} from "@/lib/steadycut";

type LiveDashboardProps = {
  missingItems: string[];
};

export function LiveDashboard({ missingItems }: LiveDashboardProps) {
  const ensureProfile = useMutation(api.profiles.ensureProfile);
  const ensureDefaultHabits = useMutation(api.habits.ensureDefaultHabits);
  const saveCheckInMutation = useMutation(api.checkIns.upsertCheckIn);
  const generateCoachAction = useAction(api.coach.generateDailyCoach);
  const { dashboard } = useDashboardQuery();

  useEffect(() => {
    void ensureProfile();
    void ensureDefaultHabits();
  }, [ensureDefaultHabits, ensureProfile]);

  if (!dashboard || dashboard.habits.length === 0) {
    return <AppLoadingPage title="Calories" />;
  }

  const data = mapDashboardData(dashboard);

  async function saveCheckIn(input: CheckInInput) {
    await saveCheckInMutation({
      ...input,
      completedHabitIds: input.completedHabitIds as Id<"habits">[],
    });
  }

  async function generateCoach(date: string) {
    return (await generateCoachAction({ date })) as CoachMessage;
  }

  return (
    <DashboardScreen
      data={data}
      missingItems={missingItems}
      mode="live"
      onGenerateCoach={generateCoach}
      onSaveCheckIn={saveCheckIn}
    />
  );
}

function mapDashboardData(dashboard: {
  profile: ({
    _id: Id<"profiles">;
  } & Omit<NonNullable<UserProfile>, "id">) | null;
  habits: Array<{
    _id: Id<"habits">;
    name: string;
    iconKey: DashboardData["habits"][number]["iconKey"];
    color: DashboardData["habits"][number]["color"];
    targetCadence: DashboardData["habits"][number]["targetCadence"];
    active: boolean;
    sortOrder: number;
  }>;
  checkIns: Array<{
    _id: Id<"checkIns">;
    date: string;
    weight: number;
    note?: string;
    mood: DashboardData["checkIns"][number]["mood"];
    completedHabitIds: Id<"habits">[];
    createdAt: number;
    updatedAt: number;
  }>;
  coachMessage: {
    _id: Id<"coachMessages">;
    date: string;
    promptSummary: string;
    insight: string;
    nextAction: string;
    createdAt: number;
  } | null;
  mealLogs: Array<{
    _id: Id<"mealLogs">;
    date: string;
    mealType: MealType;
    photoId: Id<"_storage">;
    status?: MealLog["status"];
    description?: string;
    portionGrams?: number;
    foodName: string;
    items: MealLog["items"];
    calories: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
    confidence: number;
    assumptions: string[];
    followUpQuestion?: string;
    createdAt: number;
    updatedAt: number;
  }>;
  scaleLogs: Array<{
    _id: Id<"scaleLogs">;
    date: string;
    timeOfDay: ScaleTimeOfDay;
    photoId: Id<"_storage">;
    weightKg?: number;
    rawReading?: string;
    confidence: number;
    needsManualReview: boolean;
    note?: string;
    createdAt: number;
  }>;
}): DashboardData {
  return {
    profile: dashboard.profile
      ? {
          id: dashboard.profile._id,
          displayName: dashboard.profile.displayName,
          heightCm: dashboard.profile.heightCm,
          sex: dashboard.profile.sex,
          ancestry: dashboard.profile.ancestry,
          targetCalories: dashboard.profile.targetCalories,
          targetWeightKg: dashboard.profile.targetWeightKg,
          createdAt: dashboard.profile.createdAt,
          updatedAt: dashboard.profile.updatedAt,
        }
      : null,
    habits: dashboard.habits.map((habit) => ({
      id: habit._id,
      name: habit.name,
      iconKey: habit.iconKey,
      color: habit.color,
      targetCadence: habit.targetCadence,
      active: habit.active,
      sortOrder: habit.sortOrder,
    })),
    checkIns: dashboard.checkIns.map((checkIn) => ({
      id: checkIn._id,
      date: checkIn.date,
      weight: checkIn.weight,
      note: checkIn.note,
      mood: checkIn.mood,
      completedHabitIds: checkIn.completedHabitIds,
      createdAt: checkIn.createdAt,
      updatedAt: checkIn.updatedAt,
    })),
    coachMessage: dashboard.coachMessage
      ? {
          id: dashboard.coachMessage._id,
          date: dashboard.coachMessage.date,
          promptSummary: dashboard.coachMessage.promptSummary,
          insight: dashboard.coachMessage.insight,
          nextAction: dashboard.coachMessage.nextAction,
          createdAt: dashboard.coachMessage.createdAt,
        }
      : null,
    mealLogs: dashboard.mealLogs.map((meal) => ({
      id: meal._id,
      date: meal.date,
      mealType: meal.mealType,
      photoId: meal.photoId,
      status: meal.status,
      description: meal.description,
      portionGrams: meal.portionGrams,
      foodName: meal.foodName,
      items: meal.items,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      confidence: meal.confidence,
      assumptions: meal.assumptions,
      followUpQuestion: meal.followUpQuestion,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    })),
    scaleLogs: dashboard.scaleLogs.map((log) => ({
      id: log._id,
      date: log.date,
      timeOfDay: log.timeOfDay,
      photoId: log.photoId,
      weightKg: log.weightKg,
      rawReading: log.rawReading,
      confidence: log.confidence,
      needsManualReview: log.needsManualReview,
      note: log.note,
      createdAt: log.createdAt,
    })),
  };
}
