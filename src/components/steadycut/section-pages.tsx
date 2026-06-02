"use client";

import { AlertTriangle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import type { Id } from "@convex/_generated/dataModel";
import {
  CheckIn,
  DashboardData,
  formatDisplayDate,
  moodOptions,
  UserProfile,
  MealType,
  ScaleTimeOfDay,
} from "@/lib/steadycut";

export function SetupOnlySection({
  missingItems,
  title,
}: {
  missingItems: string[];
  title: string;
}) {
  return (
    <AppPageShell
      rightLabel="Setup required"
      subtitle="Live mode is enabled, but private app services are incomplete."
      title={title}
    >
      <SetupAlert missingItems={missingItems} />
    </AppPageShell>
  );
}

export function StaticSectionPage({
  icon: Icon,
  missingItems = [],
  subtitle,
  title,
}: {
  icon: typeof Target;
  missingItems?: string[];
  subtitle: string;
  title: string;
}) {
  return (
    <AppPageShell subtitle={subtitle} title={title}>
      <SetupAlert missingItems={missingItems} />
      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    </AppPageShell>
  );
}

export function SetupAlert({ missingItems }: { missingItems: string[] }) {
  if (missingItems.length === 0) {
    return null;
  }

  return (
    <Alert className="border-dashed">
      <AlertTriangle />
      <AlertTitle>Setup still needed</AlertTitle>
      <AlertDescription>
        Missing:{" "}
        <span className="font-mono text-xs">{missingItems.join(", ")}</span>
      </AlertDescription>
    </Alert>
  );
}

export function RecentCheckInsList({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent daily check-ins</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checkIns.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No check-ins yet.
          </div>
        ) : (
          checkIns.map((checkIn) => {
            const mood = moodOptions.find((option) => option.value === checkIn.mood);

            return (
              <div key={checkIn.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {formatDisplayDate(checkIn.date)}
                  </div>
                  <div className="font-mono text-sm">
                    {checkIn.weight.toFixed(1)} kg
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {checkIn.note ?? "No note"}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{mood?.label ?? checkIn.mood}</span>
                  <span className="font-medium text-primary">
                    {checkIn.completedHabitIds.length} habits
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <Card className="glass-card spring-bounce border-white/10 dark:border-white/5">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-xl font-semibold tracking-tight">{value}</div>
          {subtext && <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export function SectionSkeleton({ title }: { title: string }) {
  return (
    <AppPageShell subtitle="Loading your private data." title={title}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96" />
    </AppPageShell>
  );
}

export function mapDashboardData(dashboard: {
  profile?: ({
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
  hydrationLogs: Array<{
    _id: Id<"hydrationLogs">;
    date: string;
    photoId?: Id<"_storage">;
    beverageName: string;
    containerName: string;
    volumeMl: number;
    confidence: number;
    assumptions: HydrationLog["assumptions"];
    createdAt: number;
    updatedAt: number;
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
    habits: (dashboard.habits ?? []).map((habit) => ({
      id: habit._id,
      name: habit.name,
      iconKey: habit.iconKey,
      color: habit.color,
      targetCadence: habit.targetCadence,
      active: habit.active,
      sortOrder: habit.sortOrder,
    })),
    checkIns: (dashboard.checkIns ?? []).map((checkIn) => ({
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
    mealLogs: (dashboard.mealLogs ?? []).map((meal) => ({
      id: meal._id,
      date: meal.date,
      mealType: meal.mealType as MealType,
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
    scaleLogs: (dashboard.scaleLogs ?? []).map((log) => ({
      id: log._id,
      date: log.date,
      timeOfDay: log.timeOfDay as ScaleTimeOfDay,
      photoId: log.photoId,
      weightKg: log.weightKg,
      rawReading: log.rawReading,
      confidence: log.confidence,
      needsManualReview: log.needsManualReview,
      note: log.note,
      createdAt: log.createdAt,
    })),
    hydrationLogs: (dashboard.hydrationLogs ?? []).map((log) => ({
      id: log._id,
      date: log.date,
      photoId: log.photoId ?? undefined,
      beverageName: log.beverageName,
      containerName: log.containerName,
      volumeMl: log.volumeMl,
      confidence: log.confidence,
      assumptions: log.assumptions,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })),
  };
}

type MealLog = NonNullable<DashboardData["mealLogs"]>[number];
type HydrationLog = NonNullable<DashboardData["hydrationLogs"]>[number];
