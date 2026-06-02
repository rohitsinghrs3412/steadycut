"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MealLog } from "@/lib/steadycut";

export function MiniMealsSummaryCard({ todaysMeals }: { todaysMeals: MealLog[] }) {
  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold text-muted-foreground">
          Logged meals
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] font-semibold">
          {todaysMeals.length} logged
        </Badge>
      </CardHeader>
      <CardContent>
        {todaysMeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-xs text-muted-foreground">No meals logged yet today.</p>
            <Button asChild size="sm" variant="link" className="mt-1 text-xs h-auto p-0">
              <Link href="/coach">Log your first meal</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todaysMeals.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card/40 p-2.5 text-xs transition-colors hover:bg-card/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-foreground truncate">{meal.foodName}</div>
                  <div className="text-[10px] text-muted-foreground capitalize mt-0.5">{meal.mealType}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-primary">{Math.round(meal.calories)}</span>
                  <span className="text-[10px] text-muted-foreground ml-0.5">kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
