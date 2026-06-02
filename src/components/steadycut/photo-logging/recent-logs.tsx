"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Droplet, Loader2, Pencil, Scale, Utensils, X } from "lucide-react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  formatDisplayDate,
  formatHydrationVolume,
  HydrationLog,
  MealLog,
  ScaleLog,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

import {
  EmptyState,
  ListSkeleton,
  PhotoThumbnail,
} from "./shared";

export function RecentMealLogs({ compact = false }: { compact?: boolean }) {
  const logs = useQuery(api.mealLogs.listRecent, { limit: compact ? 3 : 8 }) as
    | MealLog[]
    | undefined;

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Recent meals</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!logs ? (
          <ListSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={Utensils} text="No meals logged yet." />
        ) : (
          logs.map((log) => (
            <div 
              key={log.id} 
              className="flex gap-3 rounded-lg p-3 glass-card spring-bounce border border-border hover:border-primary/50 transition-all duration-300"
            >
              <PhotoThumbnail
                alt={log.foodName}
                icon={Utensils}
                src={log.photoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{log.foodName}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDisplayDate(log.date)} · {log.mealType}
                </div>
                <div className="mt-1 text-sm font-semibold text-primary">
                  {log.status === "estimating"
                    ? "Estimating..."
                    : `${Math.round(log.calories)} kcal`}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function RecentHydrationLogs({ compact = false }: { compact?: boolean }) {
  const logs = useQuery(api.hydrationLogs.listRecent, {
    limit: compact ? 3 : 8,
  }) as HydrationLog[] | undefined;

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Drink photos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!logs ? (
          <ListSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={Droplet} text="No drink photos logged yet." />
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex gap-3 rounded-lg p-3 glass-card spring-bounce border border-border hover:border-primary/50 transition-all duration-300"
            >
              <PhotoThumbnail
                alt={log.beverageName}
                icon={Droplet}
                src={log.photoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {log.beverageName}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDisplayDate(log.date)} - {log.containerName}
                </div>
                <div className="mt-1 text-sm font-semibold text-primary">
                  {formatHydrationVolume(log.volumeMl)}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function RecentScaleLogs({ compact = false }: { compact?: boolean }) {
  const logs = useQuery(api.scaleLogs.listRecent, { limit: compact ? 3 : 8 }) as
    | ScaleLog[]
    | undefined;

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Scale photos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!logs ? (
          <ListSkeleton />
        ) : logs.length === 0 ? (
          <EmptyState icon={Scale} text="No scale photos logged yet." />
        ) : (
          logs.map((log) => <ScaleLogCard key={log.id} log={log} />)
        )}
      </CardContent>
    </Card>
  );
}

function ScaleLogCard({ log }: { log: ScaleLog }) {
  const updateWeight = useMutation(api.scaleLogs.updateWeight);
  const [isEditing, setIsEditing] = useState(false);
  const [prevWeightKg, setPrevWeightKg] = useState(log.weightKg);
  const [inputValue, setInputValue] = useState(log.weightKg ? String(log.weightKg) : "");
  const [isSaving, setIsSaving] = useState(false);

  if (log.weightKg !== prevWeightKg) {
    setPrevWeightKg(log.weightKg);
    setInputValue(log.weightKg ? String(log.weightKg) : "");
  }

  async function handleSave() {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num <= 0) return;
    setIsSaving(true);
    try {
      await updateWeight({ id: log.id as Id<"scaleLogs">, weightKg: num });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update weight:", err);
    } finally {
      setIsSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(log.weightKg ? String(log.weightKg) : "");
    }
  }

  const needsReview = log.needsManualReview || !log.weightKg;

  return (
    <div 
      className={cn(
        "flex gap-3 rounded-lg p-3 glass-card spring-bounce border transition-all duration-300 relative overflow-hidden group",
        needsReview 
          ? "border-destructive/35 dark:border-destructive/20 hover:border-destructive/60 bg-destructive/5 dark:bg-destructive/5" 
          : "border-border hover:border-primary/50"
      )}
    >
      {needsReview && (
        <div className="absolute top-0 right-0 h-1.5 w-1.5 rounded-full bg-destructive animate-pulse m-2" />
      )}
      
      <PhotoThumbnail alt="Scale photo" icon={Scale} src={log.photoUrl} />
      
      <div className="min-w-0 flex-1 flex flex-col justify-center">
        <div className="flex items-center justify-between gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1.5 w-full my-0.5">
              <Input
                autoFocus
                className="h-7 w-20 px-1.5 py-0.5 text-sm font-semibold text-foreground focus-visible:ring-1 focus-visible:ring-primary"
                inputMode="decimal"
                type="number"
                step="0.1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
              />
              <span className="text-xs font-semibold text-muted-foreground mr-1">kg</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 rounded-md shrink-0 transition-transform active:scale-90 duration-150 ease-out"
                onClick={handleSave}
                disabled={isSaving}
                title="Save weight"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md shrink-0 transition-transform active:scale-90 duration-150 ease-out"
                onClick={() => {
                  setIsEditing(false);
                  setInputValue(log.weightKg ? String(log.weightKg) : "");
                }}
                disabled={isSaving}
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group/text w-full justify-between">
              <div 
                className={cn(
                  "text-sm font-semibold flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors duration-200",
                  needsReview ? "text-destructive" : "text-foreground"
                )}
                onClick={() => setIsEditing(true)}
                title="Click to manually override weight"
              >
                <span>
                  {log.weightKg ? `${log.weightKg.toFixed(1)} kg` : "Needs review"}
                </span>
                <Pencil className="h-3.5 w-3.5 opacity-0 group-hover/text:opacity-100 text-muted-foreground transition-all duration-200" />
              </div>
              
              {needsReview && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4 rounded-md">
                  OCR Override
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
          {formatDisplayDate(log.date)} · {log.timeOfDay}
        </div>
        
        {!isEditing && (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground/80 font-normal">
              Confidence: {Math.round(log.confidence * 100)}%
            </div>
            
            {needsReview && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-[10px] font-semibold text-primary hover:text-primary-foreground hover:bg-primary px-1.5 py-0.5 rounded transition-all duration-200 shrink-0"
              >
                Adjust Reading
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
