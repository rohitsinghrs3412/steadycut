"use client";

import { Camera, Droplet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  formatHydrationVolume,
  getHydrationStats,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";
import { PhotoLoggingWorkspace } from "../photo-logging-workspace";

export function HydrationBubbleWidget({
  compact = false,
  mode,
  stats,
  onQuickAdd,
}: {
  compact?: boolean;
  mode: "demo" | "live";
  stats: ReturnType<typeof getHydrationStats>;
  onQuickAdd?: (ml: number) => void;
}) {
  const fillPercent = stats.totalMl > 0 ? Math.max(stats.percent, 7) : 0;
  const lastLogText = stats.latestLog
    ? `${stats.latestLog.beverageName}, ${formatHydrationVolume(
        stats.latestLog.volumeMl
      )}`
    : "No drinks logged";

  return (
    <Card
      className={cn(
        "relative min-w-0 overflow-hidden border-primary/20 glass-card transition-all duration-300",
        compact && "bg-card/70"
      )}
      size={compact ? "sm" : "default"}
    >
      <CardContent
        className={cn(
          "relative grid items-center gap-4",
          compact
            ? "grid-cols-[88px_minmax(0,1fr)] p-4"
            : "grid-cols-[112px_minmax(0,1fr)] p-5"
        )}
      >
        <HydrationOrb
          fillPercent={fillPercent}
          isComplete={stats.isTargetMet}
          sizeClass={compact ? "size-20" : "size-24"}
        />

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Droplet className="size-4" />
                <span>Hydration</span>
              </div>
              <div className="mt-1 flex items-end gap-1.5">
                <span className="text-3xl font-semibold tracking-normal">
                  {formatHydrationVolume(stats.totalMl)}
                </span>
                <span className="pb-1 text-xs font-medium text-muted-foreground">
                  / {formatHydrationVolume(stats.targetMl)}
                </span>
              </div>
            </div>
            <Badge variant={stats.isTargetMet ? "default" : "secondary"}>
              {Math.round(stats.percent)}%
            </Badge>
          </div>

          <Progress className="mt-3 h-1.5" value={stats.percent} />
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="truncate">{lastLogText}</span>
            <span className="shrink-0 font-medium text-primary">
              {stats.isTargetMet
                ? "Target hit"
                : `${formatHydrationVolume(stats.remainingMl)} left`}
            </span>
          </div>

          {onQuickAdd && (
            <div className="mt-3 flex items-center justify-between gap-2">
              {[250, 500, 750].map((ml) => (
                <Button
                  key={ml}
                  size="sm"
                  variant="outline"
                  type="button"
                  className="h-8 flex-1 text-[11.5px] font-bold border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all duration-200 active:scale-[0.97]"
                  onClick={() => onQuickAdd(ml)}
                >
                  +{formatHydrationVolume(ml)}
                </Button>
              ))}
            </div>
          )}

          <div className="mt-3">
            {mode === "live" ? (
              <Sheet>
                <SheetTrigger asChild>
                  <Button className="h-10 w-full" size="sm" type="button">
                    <Camera data-icon="inline-start" />
                    Add drink photo
                  </Button>
                </SheetTrigger>
                <SheetContent
                  className="max-h-[88svh] overflow-y-auto rounded-t-2xl p-0 glass-card bg-transparent border-t border-white/10 dark:border-white/5"
                  side="bottom"
                >
                  <SheetHeader className="border-b pr-14">
                    <SheetTitle>Hydration photo</SheetTitle>
                    <SheetDescription>
                      Estimate the ml from a bottle, glass, tumbler, or mug.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="p-4">
                    <PhotoLoggingWorkspace
                      compact
                      focus="hydration"
                      showRecentLogs={false}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            ) : (
              <Button className="h-10 w-full" disabled size="sm" type="button">
                <Camera data-icon="inline-start" />
                Preview total
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HydrationOrb({
  fillPercent,
  isComplete,
  sizeClass,
}: {
  fillPercent: number;
  isComplete: boolean;
  sizeClass: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border bg-secondary shadow-inner",
        "border-chart-1/30 dark:border-chart-1/40",
        sizeClass
      )}
    >
      <div
        className="hydration-bubble-water absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
        style={{ height: `${fillPercent}%` }}
      >
        <div className="hydration-wave hydration-wave-one" />
        <div className="hydration-wave hydration-wave-two" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Droplet
          className={cn(
            "size-8 drop-shadow-sm",
            isComplete ? "text-primary-foreground" : "text-chart-1"
          )}
        />
      </div>
      <div className="absolute inset-1 rounded-full border border-white/40 dark:border-white/10" />
    </div>
  );
}
