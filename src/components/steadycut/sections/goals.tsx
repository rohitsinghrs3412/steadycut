"use client";

import { Flame, Goal, Scale, TrendingDown } from "lucide-react";
import Link from "next/link";

import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  createDemoDashboardData,
  getCalorieStats,
  getDashboardStats,
  getWeightGoalProgress,
  getWeightGoalSummary,
  formatWeight,
  DashboardData,
} from "@/lib/steadycut";
import {
  SectionProps,
  SetupOnlySection,
  SetupAlert,
  StatCard,
  GoalMeta,
  SectionSkeleton,
  mapDashboardData,
} from "./shared";

export function GoalsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Goals" />;
  }

  if (mode === "demo") {
    return <DemoGoalsSection missingItems={missingItems} />;
  }

  return <LiveGoalsSection />;
}

function DemoGoalsSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();

  return (
    <GoalsOverview
      data={data}
      missingItems={missingItems}
      setupLabel="Demo goals"
    />
  );
}

function LiveGoalsSection() {
  const { dashboard } = useDashboardQuery();

  if (!dashboard) {
    return <SectionSkeleton title="Goals" />;
  }

  return (
    <GoalsOverview
      data={mapDashboardData(dashboard)}
      setupLabel="Goal plan"
    />
  );
}

function GoalsOverview({
  data,
  missingItems = [],
  setupLabel,
}: {
  data: DashboardData;
  missingItems?: string[];
  setupLabel: string;
}) {
  const stats = getDashboardStats(data);
  const calories = getCalorieStats(data);
  const targetCalories = data.profile?.targetCalories ?? calories.targetCalories;
  const targetWeight = data.profile?.targetWeightKg;
  const currentWeight = stats.latest?.weight;
  const startWeight = stats.first?.weight;
  const weightProgress = getWeightGoalProgress(startWeight, currentWeight, targetWeight);
  const remainingWeight =
    currentWeight != null && targetWeight != null
      ? Math.max(currentWeight - targetWeight, 0)
      : null;
  const dailyHabitNames = stats.activeHabits
    .filter((habit) => habit.targetCadence === "daily")
    .slice(0, 3)
    .map((habit) => habit.name);

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={setupLabel}
      subtitle="Your calorie budget, target weight, and current distance to goal."
      title="Goals"
    >
      <SetupAlert missingItems={missingItems} />

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Daily calorie goal"
          value={`${Math.round(targetCalories).toLocaleString("en-IN")} kcal`}
        />
        <StatCard
          icon={Goal}
          label="Goal weight"
          value={targetWeight ? `${targetWeight.toFixed(1)} kg` : "Set target"}
        />
        <StatCard
          icon={Scale}
          label="Current weight"
          value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "No logs"}
        />
        <StatCard
          icon={TrendingDown}
          label="Remaining"
          value={
            remainingWeight == null
              ? "Add weight goal"
              : remainingWeight === 0
                ? "At goal"
                : `${remainingWeight.toFixed(1)} kg`
          }
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Weight goal progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">
                  {weightProgress == null
                    ? "--"
                    : `${Math.round(weightProgress)}%`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getWeightGoalSummary(startWeight, currentWeight, targetWeight)}
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings">Edit goals</Link>
              </Button>
            </div>
            <Progress value={weightProgress ?? 0} />
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <GoalMeta label="Start" value={formatWeight(startWeight)} />
              <GoalMeta label="Now" value={formatWeight(currentWeight)} />
              <GoalMeta label="Target" value={formatWeight(targetWeight)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today against calories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-3xl font-semibold">
                  {Math.round(calories.consumed).toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {Math.round(targetCalories).toLocaleString("en-IN")} kcal
                </div>
              </div>
              <Progress value={calories.percent} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <GoalMeta
                label={calories.remaining >= 0 ? "Left today" : "Over by"}
                value={`${Math.abs(Math.round(calories.remaining)).toLocaleString("en-IN")} kcal`}
              />
              <GoalMeta
                label="Meals logged"
                value={`${calories.todaysMeals.length}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simple operating targets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <GoalMeta
            label="This week"
            value={`${stats.checkInsThisWeek} / 7 check-ins`}
          />
          <GoalMeta label="Streak" value={`${stats.streak} days`} />
          <GoalMeta
            label="Daily basics"
            value={dailyHabitNames.length > 0 ? dailyHabitNames.join(", ") : "Add habits"}
          />
        </CardContent>
      </Card>
    </AppPageShell>
  );
}
