"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  ChevronRight,
  Droplet,
  Flame,
  MessageCircle,
  MoreVertical,
  Pencil,
  Settings,
  Smile,
  Sparkles,
  Target,
  TrendingDown,
  Waves,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DesktopAppSidebar,
  MobileHeaderLogo,
  MobileNavButton,
} from "@/components/steadycut/app-sidebar";
import {
  PhotoLoggingWorkspace,
} from "@/components/steadycut/photo-logging-workspace";
import { DemoCaloriePhotoCard } from "@/components/steadycut/demo-calorie-photo-card";
import {
  habitColorClass,
  habitIcons,
} from "@/components/steadycut/habit-presentation";
import { ThemeIconButton } from "@/components/steadycut/theme-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckIn,
  CheckInInput,
  CoachMessage,
  DashboardData,
  formatDisplayDate,
  formatHydrationVolume,
  formatWeeklyTrendSpeed,
  getCalorieStats,
  getDashboardStats,
  getHydrationStats,
  getPreviousWeightChange,
  Habit,
  moodOptions,
  Mood,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

type DashboardScreenProps = {
  data: DashboardData;
  mode: "demo" | "live";
  missingItems?: string[];
  onSaveCheckIn: (input: CheckInInput) => Promise<void>;
  onGenerateCoach: (date: string) => Promise<CoachMessage>;
};

const checkInSchema = z.object({
  date: z.string().min(1),
  weight: z.number().min(30).max(300),
  note: z.string().max(200).optional(),
  mood: z.enum(["great", "good", "flat", "hard"]),
  completedHabitIds: z.array(z.string()),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

const chartConfig = {
  weight: {
    label: "Weight",
    color: "var(--chart-1)",
  },
  trendWeight: {
    label: "7-day trend",
    color: "var(--primary)",
  },
  targetWeight: {
    label: "Target",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const moodIcon: Record<Mood, typeof Smile> = {
  great: Smile,
  good: Smile,
  flat: Smile,
  hard: Smile,
};

export function DashboardScreen({
  data,
  mode,
  missingItems = [],
  onSaveCheckIn,
  onGenerateCoach,
}: DashboardScreenProps) {
  const today = toDateKey();
  const stats = useMemo(() => getDashboardStats(data, today), [data, today]);
  const calorieStats = useMemo(
    () => getCalorieStats(data, today, data.profile?.targetCalories ?? 1800),
    [data, today]
  );
  const hydrationStats = useMemo(
    () => getHydrationStats(data, today),
    [data, today]
  );
  const [generatedCoachMessage, setGeneratedCoachMessage] =
    useState<CoachMessage | null>(null);
  const [isGeneratingCoach, setIsGeneratingCoach] = useState(false);
  const coachMessage = generatedCoachMessage ?? data.coachMessage ?? null;

  async function handleGenerateCoach() {
    setIsGeneratingCoach(true);
    try {
      const result = await onGenerateCoach(today);
      setGeneratedCoachMessage(result);
    } finally {
      setIsGeneratingCoach(false);
    }
  }

  async function handleToggleHabit(habitId: string, checked: boolean) {
    const currentIds = stats.todayCheckIn?.completedHabitIds ?? [];
    const completedHabitIds = checked
      ? Array.from(new Set([...currentIds, habitId]))
      : currentIds.filter((id) => id !== habitId);

    await onSaveCheckIn({
      date: today,
      weight: stats.todayCheckIn?.weight ?? stats.latest?.weight ?? 75,
      note: stats.todayCheckIn?.note,
      mood: stats.todayCheckIn?.mood ?? "good",
      completedHabitIds,
    });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <DesktopAppSidebar streak={stats.streak} />
      <div className="flex min-w-0 flex-col">
        <TopBar mode={mode} today={today} streak={stats.streak} />
        <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-6 p-3 pb-[calc(9rem+env(safe-area-inset-bottom))] min-[390px]:px-4 min-[390px]:pt-4 lg:px-8 lg:py-8 lg:pb-12">
          <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden lg:hidden">
            {missingItems.length > 0 ? (
              <SetupInlineNotice mode={mode} missingItems={missingItems} />
            ) : null}
            <CalorieStatusCard
              compact
              stats={calorieStats}
              streak={stats.streak}
            />
            <HydrationBubbleWidget
              compact
              mode={mode}
              stats={hydrationStats}
            />
            {mode === "live" ? (
              <PhotoLoggingWorkspace compact focus="meal" />
            ) : (
              <DemoCaloriePhotoCard />
            )}
            <TodayCheckInCard
              activeHabits={stats.activeHabits}
              latestWeight={stats.latest?.weight ?? 75}
              onSaveCheckIn={onSaveCheckIn}
              todayCheckIn={stats.todayCheckIn}
            />
            <WeightTrendCard
              compact
              delta={stats.delta}
              latest={stats.latest}
              latestTrendWeight={stats.weightTrend.latestTrendWeight}
              trendData={stats.trendData}
              weeklySpeed={stats.weightTrend.weeklySpeed}
              targetWeight={data.profile?.targetWeightKg}
            />
            <HabitsCard
              activeHabits={stats.activeHabits}
              completedHabitIds={stats.todayCheckIn?.completedHabitIds ?? []}
              onToggleHabit={handleToggleHabit}
            />
          </div>

          <div className="hidden flex-col gap-6 lg:flex">
            {missingItems.length > 0 ? (
              <SetupInlineNotice mode={mode} missingItems={missingItems} />
            ) : null}
            
            <div className="hidden gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] lg:flex lg:flex-col">
              {/* Left Column (Wide panels) */}
              <div className="flex flex-col gap-6 min-w-0">
                {mode === "live" ? (
                  <PhotoLoggingWorkspace focus="meal" />
                ) : (
                  <DemoCaloriePhotoCard />
                )}
                
                <WeightTrendCard
                  delta={stats.delta}
                  latest={stats.latest}
                  latestTrendWeight={stats.weightTrend.latestTrendWeight}
                  trendData={stats.trendData}
                  weeklySpeed={stats.weightTrend.weeklySpeed}
                  targetWeight={data.profile?.targetWeightKg}
                />
                
                <ConsistencyCard
                  activeHabitsCount={stats.activeHabits.length}
                  checkInDateSet={stats.checkInDateSet}
                  checkInsThisMonth={stats.checkInsThisMonth}
                  checkInsThisWeek={stats.checkInsThisWeek}
                  streak={stats.streak}
                  weekKeys={stats.weekKeys}
                />
                
                <HabitsCard
                  activeHabits={stats.activeHabits}
                  completedHabitIds={stats.todayCheckIn?.completedHabitIds ?? []}
                  onToggleHabit={handleToggleHabit}
                />
              </div>

              {/* Right Column (Narrower card widgets) */}
              <div className="flex flex-col gap-6">
                <CalorieStatusCard stats={calorieStats} streak={stats.streak} />
                <HydrationBubbleWidget mode={mode} stats={hydrationStats} />
                <TodayCheckInCard
                  activeHabits={stats.activeHabits}
                  latestWeight={stats.latest?.weight ?? 75}
                  onSaveCheckIn={onSaveCheckIn}
                  todayCheckIn={stats.todayCheckIn}
                />
                <DailyCoachCard
                  coachMessage={coachMessage}
                  isGenerating={isGeneratingCoach}
                  onGenerate={handleGenerateCoach}
                />
              </div>
            </div>

            <RecentCheckInsCard
              activeHabitCount={stats.activeHabits.length}
              checkIns={stats.sortedCheckIns}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({
  mode,
  today,
  streak,
}: {
  mode: "demo" | "live";
  today: string;
  streak: number;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <MobileNavButton streak={streak} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">
              <span>Today</span>
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground md:block mt-0.5">
              Add food, check calories left, then log the day.
            </p>
          </div>
        </div>
        <MobileHeaderLogo />

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="hidden items-center gap-2 md:flex">
            <Calendar className="size-4" />
            <span>{formatDisplayDate(today)}</span>
          </div>
          <Separator className="hidden h-4 md:block" orientation="vertical" />
          <div className="hidden items-center gap-2 font-medium text-chart-1 sm:flex">
            <Sparkles className="size-4" />
            <span>{mode === "live" ? "Live estimates" : "Preview mode"}</span>
          </div>
          <ThemeIconButton className="shrink-0" />
          <Button asChild className="hidden lg:hidden" size="icon" variant="outline">
            <Link href="/settings">
              <Settings />
              <span className="sr-only">Open settings</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SetupInlineNotice({
  missingItems,
  mode,
}: {
  missingItems: string[];
  mode: "demo" | "live";
}) {
  return (
    <Alert className="border-dashed">
      <Sparkles />
      <AlertTitle>
        {mode === "demo" ? "Preview mode is active" : "Gemini setup remaining"}
      </AlertTitle>
      <AlertDescription>
        Missing:{" "}
        <span className="font-mono text-xs">{missingItems.join(", ")}</span>
      </AlertDescription>
    </Alert>
  );
}

function CalorieStatusCard({
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

function HydrationBubbleWidget({
  compact = false,
  mode,
  stats,
}: {
  compact?: boolean;
  mode: "demo" | "live";
  stats: ReturnType<typeof getHydrationStats>;
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

          <div className="mt-4">
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

function TodayCheckInCard({
  activeHabits,
  latestWeight,
  onSaveCheckIn,
  todayCheckIn,
}: {
  activeHabits: Habit[];
  latestWeight: number;
  onSaveCheckIn: (input: CheckInInput) => Promise<void>;
  todayCheckIn: CheckIn | null;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: getCheckInDefaults(activeHabits, latestWeight, todayCheckIn),
  });
  const note = useWatch({ control: form.control, name: "note" }) ?? "";
  const mood = useWatch({ control: form.control, name: "mood" });

  useEffect(() => {
    form.reset(getCheckInDefaults(activeHabits, latestWeight, todayCheckIn));
  }, [activeHabits, form, latestWeight, todayCheckIn]);

  async function onSubmit(values: CheckInFormValues) {
    setStatus("saving");
    await onSaveCheckIn({
      ...values,
      note: values.note?.trim() || undefined,
    });
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle>{"Today's check-in"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1">
            <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-1">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                inputMode="decimal"
                step="0.1"
                type="number"
                {...form.register("weight", { valueAsNumber: true })}
              />
              {form.formState.errors.weight ? (
                <p className="text-xs text-destructive">
                  Enter a realistic weight in kg.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mood">Mood</Label>
              <Select
                value={mood}
                onValueChange={(value: Mood) =>
                  form.setValue("mood", value, { shouldDirty: true })
                }
              >
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {moodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note">Note</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {note.length}/200
              </span>
            </div>
            <Textarea
              id="note"
              placeholder="How are you feeling? Anything to note?"
              rows={3}
              {...form.register("note")}
            />
          </div>

          <Button
            className="h-11 scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]"
            disabled={status === "saving"}
            type="submit"
          >
            {status === "saving" ? "Saving..." : "Log check-in"}
          </Button>
          {status === "saved" ? (
            <p className="text-center text-sm font-medium text-primary">
              Check-in saved.
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function HabitsCard({
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
          <p className="text-sm text-primary">Today</p>
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
              <button
                key={habit.id}
                type="button"
                onClick={() => void onToggleHabit(habit.id, !isComplete)}
                className="flex w-full items-center gap-3 border-b p-3 last:border-b-0 text-left transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    habitColorClass[habit.color]
                  )}
                >
                  <Icon />
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
              </button>
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

function WeightTrendCard({
  compact = false,
  delta,
  latest,
  latestTrendWeight,
  trendData,
  weeklySpeed,
  targetWeight,
}: {
  compact?: boolean;
  delta: number;
  latest: CheckIn | null;
  latestTrendWeight: number | null;
  trendData: Array<{
    date: string;
    label: string;
    weight: number;
    trendWeight: number;
  }>;
  weeklySpeed: number | null;
  targetWeight?: number;
}) {
  const [range, setRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const filteredData = useMemo(() => {
    if (range === "all") return trendData;
    if (trendData.length === 0) return trendData;

    const latestDateStr = trendData[trendData.length - 1].date;
    const latestDate = new Date(`${latestDateStr}T12:00:00`);
    const daysLimit = range === "7d" ? 7 : range === "30d" ? 30 : 90;

    return trendData.filter((point) => {
      const pointDate = new Date(`${point.date}T12:00:00`);
      const diffTime = latestDate.getTime() - pointDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return diffDays < daysLimit;
    });
  }, [trendData, range]);

  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return ["auto", "auto"];
    const weights = filteredData.flatMap((d) => [d.weight, d.trendWeight]);
    let min = Math.min(...weights);
    let max = Math.max(...weights);
    if (targetWeight) {
      min = Math.min(min, targetWeight);
      max = Math.max(max, targetWeight);
    }
    return [Math.floor(min - 1.5), Math.ceil(max + 1.5)];
  }, [filteredData, targetWeight]);

  return (
    <Card size={compact ? "sm" : "default"} className="glass-card transition-all duration-300">
      <CardHeader className="flex-row items-start justify-between pb-2">
        <div>
          <CardTitle>Weight trend</CardTitle>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-3xl font-semibold">
              {latestTrendWeight ? latestTrendWeight.toFixed(1) : "--"}
            </span>
            <span className="pb-1 text-sm font-medium text-muted-foreground">
              kg
            </span>
          </div>
          <p className="text-sm text-muted-foreground">7-day EWMA</p>
        </div>
        <div className="text-right flex flex-col items-end gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 border border-border/40 w-fit">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 uppercase text-center min-w-[38px]",
                  range === r
                    ? "bg-background text-foreground shadow-sm scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-end gap-2 font-medium text-primary">
              <TrendingDown />
              <span>{formatWeeklyTrendSpeed(weeklySpeed)}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {latest ? `${Math.abs(delta).toFixed(1)} kg raw move` : "No logs"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className={cn(
            "w-full",
            compact ? "h-[170px] min-h-[170px]" : "h-[230px] min-h-[230px]"
          )}
          config={chartConfig}
        >
          <AreaChart data={filteredData} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              domain={yDomain}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(Number(value))}`}
              tickMargin={10}
              width={44}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              dataKey="weight"
              fill="var(--color-weight)"
              fillOpacity={0.1}
              stroke="var(--color-weight)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="trendWeight"
              fill="var(--color-trendWeight)"
              fillOpacity={0.16}
              stroke="var(--color-trendWeight)"
              strokeWidth={3}
              type="monotone"
            />
            {targetWeight && (
              <ReferenceLine
                y={targetWeight}
                stroke="var(--color-targetWeight)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Target: ${targetWeight} kg`,
                  position: "insideBottomRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 10,
                  fontWeight: 600,
                  offset: 8,
                }}
              />
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function ConsistencyCard({
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
                    {isDone ? <Check /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="text-chart-1" />
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
              <Target className="text-primary" />
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

function DailyCoachCard({
  coachMessage,
  isGenerating,
  onGenerate,
}: {
  coachMessage: CoachMessage | null;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
}) {
  return (
    <Card className="xl:flex-1 glass-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle>Daily coach</CardTitle>
        <div className="flex items-center gap-2 text-sm font-medium text-chart-1">
          <Sparkles />
          <span>Coach</span>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[520px] flex-col gap-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 text-primary" />
          <div className="flex flex-col gap-4">
            <p className="font-medium">
              {coachMessage
                ? "You kept your streak alive. That's the real win."
                : "Ready when you are."}
            </p>
            <p className="leading-7 text-muted-foreground">
              {coachMessage?.insight ??
                "Log today's check-in, then ask the coach for one small action based on your recent trend."}
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <div className="font-medium text-chart-1">Next small action</div>
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-secondary text-chart-1">
              <Waves />
            </div>
            <div>
              <div className="font-medium">
                {coachMessage?.nextAction ?? "Finish today's check-in."}
              </div>
            </div>
          </div>
        </div>
        <Button
          className="mt-auto h-11"
          disabled={isGenerating}
          onClick={onGenerate}
          variant="outline"
        >
          <MessageCircle data-icon="inline-start" />
          {isGenerating ? "Asking coach..." : "Ask Coach"}
        </Button>
      </CardContent>
    </Card>
  );
}

function RecentCheckInsCard({
  activeHabitCount,
  checkIns,
}: {
  activeHabitCount: number;
  checkIns: CheckIn[];
}) {
  const recent = [...checkIns].reverse().slice(0, 6);

  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:hidden">
          {recent.map((checkIn) => {
            const change = getPreviousWeightChange(checkIn, checkIns);

            return (
              <div 
                key={checkIn.id} 
                className="rounded-lg p-4 glass-card spring-bounce border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {formatDisplayDate(checkIn.date)}
                  </div>
                  <div className="font-mono text-sm">
                    {checkIn.weight.toFixed(1)} kg
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 text-muted-foreground">
                    {checkIn.note ?? "No note"}
                  </span>
                  <span className="shrink-0 font-medium text-primary">
                    {checkIn.completedHabitIds.length} / {activeHabitCount}
                  </span>
                </div>
                {change != null ? (
                  <div
                    className={cn(
                      "mt-2 text-sm font-medium",
                      change <= 0 ? "text-primary" : "text-chart-3"
                    )}
                  >
                    {change <= 0 ? "-" : "+"} {Math.abs(change).toFixed(1)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Habits</TableHead>
                <TableHead>Mood</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((checkIn) => {
                const change = getPreviousWeightChange(checkIn, checkIns);
                const MoodIcon = moodIcon[checkIn.mood];

                return (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {formatDisplayDate(checkIn.date)}
                    </TableCell>
                    <TableCell>{checkIn.weight.toFixed(1)}</TableCell>
                    <TableCell>
                      {change == null ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span
                          className={cn(
                            "font-medium",
                            change <= 0 ? "text-primary" : "text-chart-3"
                          )}
                        >
                          {change <= 0 ? "-" : "+"} {Math.abs(change).toFixed(1)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-64 text-muted-foreground">
                      {checkIn.note ?? "No note"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {checkIn.completedHabitIds.length} / {activeHabitCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MoodIcon className="text-primary" />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost">
                        <MoreVertical />
                        <span className="sr-only">Check-in actions</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-center">
          <Button asChild variant="link">
            <Link href="/check-ins">View all check-ins</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getCheckInDefaults(
  activeHabits: Habit[],
  latestWeight: number,
  todayCheckIn: CheckIn | null
): CheckInFormValues {
  return {
    date: todayCheckIn?.date ?? toDateKey(),
    weight: todayCheckIn?.weight ?? latestWeight,
    note: todayCheckIn?.note ?? "",
    mood: todayCheckIn?.mood ?? "good",
    completedHabitIds:
      todayCheckIn?.completedHabitIds ?? activeHabits.map((habit) => habit.id),
  };
}
