"use client";

import { Camera, Flame } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCalorieStats } from "@/lib/steadycut";
import { cn } from "@/lib/utils";

export function CalorieStatusCard({
  compact = false,
  stats,
  streak,
}: {
  compact?: boolean;
  stats: ReturnType<typeof getCalorieStats>;
  streak: number;
}) {
  return (
    <Card
      className={cn(
        "min-w-0 glass-card transition-all duration-300",
        compact && "bg-accent/35"
      )}
      size={compact ? "sm" : "default"}
    >
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>Calories today</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.todaysMeals.length} meals logged
          </p>
        </div>
        <Badge variant={stats.isOnTrack ? "default" : "secondary"}>
          {stats.isOnTrack ? "On track" : "Review"}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-4xl font-semibold tracking-normal">
              {Math.round(stats.consumed)}
            </div>
            <div className="text-sm text-muted-foreground">
              of {Math.round(stats.targetCalories)} kcal
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "text-2xl font-semibold",
                stats.isOnTrack ? "text-primary" : "text-chart-3"
              )}
            >
              {Math.abs(Math.round(stats.remaining))}
            </div>
            <div className="text-sm text-muted-foreground">
              {stats.remaining >= 0 ? "kcal left" : "kcal over"}
            </div>
          </div>
        </div>
        <Progress className="h-2" value={stats.percent} />
        <div className="grid grid-cols-3 gap-2 [grid-template-columns:repeat(3,minmax(0,1fr))]">
          <CalorieMetric label="Protein" value={`${Math.round(stats.protein)}g`} />
          <CalorieMetric label="Carbs" value={`${Math.round(stats.carbs)}g`} />
          <CalorieMetric label="Fat" value={`${Math.round(stats.fat)}g`} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/70 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flame />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{streak} day streak</div>
              <div className="text-xs text-muted-foreground">
                Stay close enough today.
              </div>
            </div>
          </div>
          <Button
            asChild
            className="size-8 shrink-0 px-0 sm:h-7 sm:w-auto sm:px-2.5"
            size="sm"
            variant="outline"
          >
            <Link href="/coach" scroll={false}>
              <Camera />
              <span className="sr-only sm:not-sr-only">Photo</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CalorieMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
    </div>
  );
}
