"use client";

import { ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  habitColorClass,
  habitIcons,
} from "@/components/steadycut/habit-presentation";
import { Habit } from "@/lib/steadycut";
import { cn } from "@/lib/utils";

export function HabitsCard({
  activeHabits,
  completedHabitIds,
  onToggleHabit,
}: {
  activeHabits: Habit[];
  completedHabitIds: string[];
  onToggleHabit: (habitId: string, checked: boolean) => Promise<void>;
}) {
  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Habits</CardTitle>
          <p className="text-sm text-primary font-medium">Today</p>
        </div>
        <Button asChild size="sm" variant="ghost">
          <Link href="/habits">
            <Pencil data-icon="inline-start" />
            Edit habits
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-lg border bg-card/30">
          {activeHabits.map((habit) => {
            const Icon = habitIcons[habit.iconKey];
            const isComplete = completedHabitIds.includes(habit.id);

            return (
              <div
                key={habit.id}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void onToggleHabit(habit.id, !isComplete);
                  }
                }}
                onClick={() => void onToggleHabit(habit.id, !isComplete)}
                className="flex w-full items-center gap-3 border-b p-3 last:border-b-0 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none cursor-pointer"
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    habitColorClass[habit.color]
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {habit.name}
                </div>
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border pointer-events-none",
                    isComplete && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  <Checkbox
                    checked={isComplete}
                    tabIndex={-1}
                  />
                </div>
                <ChevronRight className="size-4 text-muted-foreground/60 shrink-0" />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            {completedHabitIds.length} of {activeHabits.length} habits completed
          </span>
          <Button asChild size="sm" variant="link">
            <Link href="/habits">
              View habits
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
