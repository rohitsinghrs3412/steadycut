"use client";

import { CalendarCheck, Check, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function ConsistencyCard({
  activeHabitsCount,
  checkInDateSet,
  checkInsThisMonth,
  checkInsThisWeek,
  streak,
  weekKeys,
}: {
  activeHabitsCount: number;
  checkInDateSet: Set<string>;
  checkInsThisMonth: number;
  checkInsThisWeek: number;
  streak: number;
  weekKeys: string[];
}) {
  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Streak & consistency</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-4xl font-semibold text-chart-3">{streak}</div>
            <div className="text-sm font-medium text-chart-3">day streak</div>
          </div>
          <div className="flex gap-3">
            {weekKeys.map((date) => {
              const isDone = checkInDateSet.has(date);

              return (
                <div key={date} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "narrow",
                    }).format(new Date(`${date}T12:00:00`))}
                  </span>
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-sm",
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-chart-1 text-chart-1"
                    )}
                  >
                    {isDone ? <Check className="size-4" /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="text-chart-1 size-5 shrink-0" />
              <div>
                <div className="font-semibold">{checkInsThisWeek} / 7</div>
                <div className="text-sm text-muted-foreground">
                  Check-ins this week
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Target className="text-primary size-5 shrink-0" />
              <div>
                <div className="font-semibold">{checkInsThisMonth} / 30</div>
                <div className="text-sm text-muted-foreground">
                  Check-ins this month
                </div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Habit completion today
            </span>
            <span className="font-medium">{activeHabitsCount} habits tracked</span>
          </div>
          <Progress value={Math.min((checkInsThisWeek / 7) * 100, 100)} />
        </div>
      </CardContent>
    </Card>
  );
}
