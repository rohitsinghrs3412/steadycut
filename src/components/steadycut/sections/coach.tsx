"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  createDemoDashboardData,
  getCalorieStats,
} from "@/lib/steadycut";
import { SectionProps, SetupOnlySection, SetupAlert } from "./shared";

const PhotoLoggingWorkspace = dynamic(
  () =>
    import("@/components/steadycut/photo-logging-workspace").then(
      (mod) => mod.PhotoLoggingWorkspace
    ),
  { ssr: false }
);

const DemoCaloriePhotoCard = dynamic(
  () =>
    import("@/components/steadycut/demo-calorie-photo-card").then(
      (mod) => mod.DemoCaloriePhotoCard
    ),
  { ssr: false }
);

export function CoachSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Food" />;
  }

  if (mode === "demo") {
    return <DemoFoodSection missingItems={missingItems} />;
  }

  return (
    <AppPageShell
      rightLabel="Live estimates"
      subtitle="Meal photo estimates, follow-up questions, and practical coaching."
      title="Food"
    >
      <Alert className="border-dashed">
        <Sparkles />
        <AlertTitle>Food estimates are deliberately cautious</AlertTitle>
        <AlertDescription>
          Add grams, oil/ghee level, and dish names whenever you can. The coach
          will ask one follow-up question when the photo is not enough.
        </AlertDescription>
      </Alert>
      <PhotoLoggingWorkspace focus="meal" />
    </AppPageShell>
  );
}

function DemoFoodSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();
  const calories = getCalorieStats(data);

  return (
    <AppPageShell
      rightLabel="Preview mode"
      subtitle="Add a meal photo, estimate calories, and see what is left today."
      title="Food"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DemoCaloriePhotoCard />
        <Card>
          <CardHeader>
            <CardTitle>Today from demo meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-3xl font-semibold">
                  {Math.round(calories.consumed).toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {Math.round(calories.targetCalories).toLocaleString("en-IN")} kcal
                </div>
              </div>
              <Progress value={calories.percent} />
            </div>
            <div className="grid gap-3">
              {calories.todaysMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{meal.foodName}</div>
                    <div className="text-sm text-muted-foreground">
                      {meal.mealType}
                    </div>
                  </div>
                  <Badge>{Math.round(meal.calories)} kcal</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}
