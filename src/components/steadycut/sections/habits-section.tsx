"use client";

import { useMutation } from "convex/react";
import {
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import {
  habitColorClass,
  habitColorOptions,
  habitIconOptions,
  habitIcons,
} from "@/components/steadycut/habit-presentation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import {
  SetupAlert,
  SetupOnlySection,
  SectionSkeleton,
  mapDashboardData,
} from "@/components/steadycut/section-pages";
import {
  DashboardData,
  Habit,
  HabitIconKey,
  getDashboardStats,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

type SectionProps = {
  mode: "demo" | "live" | "setup";
  missingItems: string[];
};

type HabitFormInput = {
  name: string;
  iconKey: HabitIconKey;
  color: Habit["color"];
  targetCadence: Habit["targetCadence"];
  active: boolean;
};

export function HabitsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Habits" />;
  }

  if (mode === "demo") {
    return <DemoHabitsSection missingItems={missingItems} />;
  }

  return <LiveHabitsSection />;
}

function DemoHabitsSection({ missingItems }: { missingItems: string[] }) {
  return (
    <HabitsOverview
      data={createDemoDashboardData()}
      missingItems={missingItems}
      rightLabel="Preview mode"
    />
  );
}

function createDemoDashboardData(): DashboardData {
  return {
    habits: [
      { id: "calorie-target", name: "Stay within calorie target", iconKey: "utensils", color: "green", targetCadence: "daily", active: true, sortOrder: 0 },
      { id: "strength-training", name: "Strength training", iconKey: "dumbbell", color: "blue", targetCadence: "weekly", active: true, sortOrder: 1 },
      { id: "water", name: "2L+ water", iconKey: "droplet", color: "amber", targetCadence: "daily", active: true, sortOrder: 2 },
      { id: "steps", name: "8k+ steps", iconKey: "footprints", color: "violet", targetCadence: "daily", active: true, sortOrder: 3 }
    ],
    checkIns: [],
  };
}

function LiveHabitsSection() {
  const { dashboard } = useDashboardQuery();
  const addHabitMutation = useMutation(api.habits.addHabit);
  const updateHabitMutation = useMutation(api.habits.updateHabit);
  const deleteHabitMutation = useMutation(api.habits.deleteHabit);
  const reorderHabitsMutation = useMutation(api.habits.reorderHabits);

  if (!dashboard) {
    return <SectionSkeleton title="Habits" />;
  }

  return (
    <HabitsOverview
      data={mapDashboardData(dashboard)}
      rightLabel="Habits"
      onAddHabit={async (input) => {
        await addHabitMutation(input);
      }}
      onDeleteHabit={async (id) => {
        await deleteHabitMutation({ id: id as Id<"habits"> });
      }}
      onReorderHabits={async (items) => {
        await reorderHabitsMutation({
          habits: items.map((item) => ({
            id: item.id as Id<"habits">,
            sortOrder: item.sortOrder,
          })),
        });
      }}
      onUpdateHabit={async (id, input) => {
        await updateHabitMutation({
          id: id as Id<"habits">,
          ...input,
        });
      }}
    />
  );
}

function HabitsOverview({
  data,
  missingItems = [],
  onAddHabit,
  onDeleteHabit,
  onReorderHabits,
  onUpdateHabit,
  rightLabel,
}: {
  data: DashboardData;
  missingItems?: string[];
  onAddHabit?: (input: HabitFormInput) => Promise<void>;
  onDeleteHabit?: (id: string) => Promise<void>;
  onReorderHabits?: (
    items: Array<{ id: string; sortOrder: number }>
  ) => Promise<void>;
  onUpdateHabit?: (id: string, input: HabitFormInput) => Promise<void>;
  rightLabel: string;
}) {
  const stats = getDashboardStats(data);
  const habits = stats.activeHabits;
  const canManage = Boolean(
    onAddHabit && onDeleteHabit && onReorderHabits && onUpdateHabit
  );

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={rightLabel}
      subtitle="Define daily consistency markers for checking in."
      title="Habits"
    >
      <SetupAlert missingItems={missingItems} />

      <Card className="glass-card border-white/10 dark:border-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Habits logbook</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Drag/Order active markers</p>
          </div>
          {canManage && <HabitEditorSheet onSave={onAddHabit!} />}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {habits.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No habits defined. Add a habit to get started.
            </div>
          ) : (
            habits.map((habit, index) => {
              const Icon = habitIcons[habit.iconKey];

              return (
                <div
                  key={habit.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3.5 bg-card/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "p-2 rounded bg-primary/10 text-primary",
                        habitColorClass[habit.color]
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate max-w-[200px] sm:max-w-[320px]">
                        {habit.name}
                      </div>
                      <div className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">
                        {habit.targetCadence}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveHabit(habits, index, -1, onReorderHabits)}
                      >
                        <ArrowUp />
                        <span className="sr-only">Move up</span>
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        disabled={index === habits.length - 1}
                        onClick={() => moveHabit(habits, index, 1, onReorderHabits)}
                      >
                        <ArrowDown />
                        <span className="sr-only">Move down</span>
                      </Button>
                      <HabitEditorSheet
                        habit={habit}
                        onSave={(input) => onUpdateHabit!(habit.id, input)}
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDeleteHabit(habit, onDeleteHabit)}
                      >
                        <Trash2 />
                        <span className="sr-only">Delete habit</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </AppPageShell>
  );
}

function HabitEditorSheet({
  habit,
  onSave,
}: {
  habit?: Habit;
  onSave: (input: HabitFormInput) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(habit?.name ?? "");
  const [iconKey, setIconKey] = useState<HabitIconKey>(
    habit?.iconKey ?? "utensils"
  );
  const [color, setColor] = useState<Habit["color"]>(habit?.color ?? "green");
  const [targetCadence, setTargetCadence] = useState<Habit["targetCadence"]>(
    habit?.targetCadence ?? "daily"
  );
  const [active, setActive] = useState(habit?.active ?? true);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSave() {
    if (!name.trim()) {
      setStatus("error");
      return;
    }

    setStatus("saving");

    try {
      await onSave({
        name: name.trim(),
        iconKey,
        color,
        targetCadence,
        active,
      });
      setStatus("idle");
      setOpen(false);

      if (!habit) {
        setName("");
        setIconKey("utensils");
        setColor("green");
        setTargetCadence("daily");
        setActive(true);
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={habit ? "icon-sm" : "sm"} variant={habit ? "outline" : "default"}>
          {habit ? <Pencil /> : <Plus data-icon="inline-start" />}
          <span className={habit ? "sr-only" : undefined}>
            {habit ? `Edit ${habit.name}` : "Add habit"}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent className="max-h-[88svh] overflow-y-auto p-0 sm:max-w-xl sm:mx-auto sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-xl sm:border-x" side="bottom">
        <SheetHeader className="border-b pr-14">
          <SheetTitle>{habit ? "Edit habit" : "Add habit"}</SheetTitle>
          <SheetDescription>
            Tune the small action, cadence, and dashboard color.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`habit-name-${habit?.id ?? "new"}`}>Name</Label>
            <Input
              id={`habit-name-${habit?.id ?? "new"}`}
              maxLength={60}
              placeholder="Example: 8k+ steps"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-3 min-[380px]:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
              <Select
                value={iconKey}
                onValueChange={(value: HabitIconKey) => setIconKey(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {habitIconOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Cadence</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["daily", "weekly"] as const).map((cadence) => (
                  <Button
                    key={cadence}
                    type="button"
                    variant={targetCadence === cadence ? "default" : "outline"}
                    onClick={() => setTargetCadence(cadence)}
                  >
                    {cadence}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {habitColorOptions.map((option) => (
                <button
                  key={option.value}
                  aria-label={option.label}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg border text-xs font-medium",
                    habitColorClass[option.value],
                    color === option.value && "ring-3 ring-ring/50"
                  )}
                  type="button"
                  onClick={() => setColor(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={active}
              onCheckedChange={(checked) => setActive(checked === true)}
            />
            Active habit
          </label>

          {status === "error" ? (
            <p className="text-sm font-medium text-destructive">
              Add a habit name and try again.
            </p>
          ) : null}

          <Button className="h-11" disabled={status === "saving"} onClick={handleSave}>
            {status === "saving" ? "Saving..." : habit ? "Save habit" : "Add habit"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

async function moveHabit(
  habits: Habit[],
  index: number,
  direction: -1 | 1,
  onReorderHabits?: (items: Array<{ id: string; sortOrder: number }>) => Promise<void>
) {
  if (!onReorderHabits) {
    return;
  }

  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= habits.length) {
    return;
  }

  const reordered = [...habits];
  const [item] = reordered.splice(index, 1);

  if (!item) {
    return;
  }

  reordered.splice(nextIndex, 0, item);
  await onReorderHabits(
    reordered.map((habit, sortOrder) => ({
      id: habit.id,
      sortOrder,
    }))
  );
}

async function confirmDeleteHabit(
  habit: Habit,
  onDeleteHabit?: (id: string) => Promise<void>
) {
  if (!onDeleteHabit) {
    return;
  }

  if (window.confirm(`Delete "${habit.name}"? This removes it from check-ins.`)) {
    await onDeleteHabit(habit.id);
  }
}
