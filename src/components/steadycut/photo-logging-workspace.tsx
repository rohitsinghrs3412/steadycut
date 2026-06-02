"use client";

import { cn } from "@/lib/utils";
import { MealPhotoLogger } from "./photo-logging/meal-logger";
import { HydrationPhotoLogger } from "./photo-logging/hydration-logger";
import { ScalePhotoLogger } from "./photo-logging/scale-logger";
import { RecentMealLogs, RecentHydrationLogs, RecentScaleLogs } from "./photo-logging/recent-logs";

type WorkspaceFocus = "meal" | "scale" | "hydration" | "all";

export function PhotoLoggingWorkspace({
  compact = false,
  focus,
  showRecentLogs = true,
}: {
  compact?: boolean;
  focus: WorkspaceFocus;
  showRecentLogs?: boolean;
}) {
  const showMeal = focus === "meal" || focus === "all";
  const showScale = focus === "scale" || focus === "all";
  const showHydration = focus === "hydration" || focus === "all";

  return (
    <div
      className={cn(
        compact
          ? "flex flex-col gap-3"
          : "grid gap-6 2xl:grid-cols-[minmax(0,1fr)_390px]"
      )}
    >
      <div className="flex flex-col gap-4">
        {showMeal ? <MealPhotoLogger compact={compact} /> : null}
        {showHydration ? <HydrationPhotoLogger compact={compact} /> : null}
        {showScale ? <ScalePhotoLogger compact={compact} /> : null}
      </div>
      {showRecentLogs ? (
        <div className="flex flex-col gap-4">
          {showMeal ? <RecentMealLogs compact={compact} /> : null}
          {showHydration ? <RecentHydrationLogs compact={compact} /> : null}
          {showScale ? <RecentScaleLogs compact={compact} /> : null}
        </div>
      ) : null}
    </div>
  );
}
