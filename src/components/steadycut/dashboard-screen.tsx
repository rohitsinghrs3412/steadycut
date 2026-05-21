"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Calendar,
  CalendarCheck,
  Camera,
  Check,
  ChevronRight,
  Dumbbell,
  Footprints,
  Flame,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  Settings,
  Smile,
  Sparkles,
  Target,
  TrendingDown,
  Utensils,
  Waves,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
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
  PhotoCapturePicker,
  PhotoLoggingWorkspace,
} from "@/components/steadycut/photo-logging-workspace";
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
  getCalorieStats,
  getDashboardStats,
  getPreviousWeightChange,
  Habit,
  HabitIconKey,
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

const habitIcons: Record<HabitIconKey, typeof Utensils> = {
  utensils: Utensils,
  dumbbell: Dumbbell,
  droplet: Waves,
  footprints: Footprints,
};

const habitColorClass: Record<Habit["color"], string> = {
  green: "bg-primary text-primary-foreground",
  blue: "bg-chart-1 text-white",
  amber: "bg-chart-3 text-foreground",
  violet: "bg-chart-5 text-white",
};

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
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <DesktopAppSidebar streak={stats.streak} />
      <div className="flex min-w-0 flex-col">
        <TopBar mode={mode} today={today} streak={stats.streak} />
        <main className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden p-3 pb-[calc(9rem+env(safe-area-inset-bottom))] min-[390px]:px-4 min-[390px]:pt-4 lg:p-5 lg:pb-5">
          <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden lg:hidden">
            {missingItems.length > 0 ? (
              <SetupInlineNotice mode={mode} missingItems={missingItems} />
            ) : null}
            <CalorieStatusCard
              compact
              stats={calorieStats}
              streak={stats.streak}
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

          <div className="hidden flex-col gap-4 lg:flex">
            {missingItems.length > 0 ? (
              <SetupInlineNotice mode={mode} missingItems={missingItems} />
            ) : null}
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="min-w-0">
                {mode === "live" ? (
                  <PhotoLoggingWorkspace focus="meal" />
                ) : (
                  <DemoCaloriePhotoCard />
                )}
              </div>
              <div className="flex flex-col gap-4">
                <CalorieStatusCard stats={calorieStats} streak={stats.streak} />
                <TodayCheckInCard
                  activeHabits={stats.activeHabits}
                  latestWeight={stats.latest?.weight ?? 75}
                  onSaveCheckIn={onSaveCheckIn}
                  todayCheckIn={stats.todayCheckIn}
                />
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex flex-col gap-4">
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

              <DailyCoachCard
                coachMessage={coachMessage}
                isGenerating={isGeneratingCoach}
                onGenerate={handleGenerateCoach}
              />
            </section>

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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8 relative">
      <div className="flex min-w-0 items-center gap-3">
        <MobileNavButton streak={streak} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">
            <span>Today</span>
          </h1>
          <p className="hidden truncate text-sm text-muted-foreground md:block">
            Add food, check calories left, then log the day.
          </p>
        </div>
      </div>
      <MobileHeaderLogo />

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="hidden items-center gap-2 md:flex">
          <Calendar />
          <span>{formatDisplayDate(today)}</span>
        </div>
        <Separator className="hidden h-6 md:block" orientation="vertical" />
        <div className="hidden items-center gap-2 font-medium text-chart-1 sm:flex">
          <Sparkles />
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

export function DemoCaloriePhotoCard() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [estimated, setEstimated] = useState(false);

  useEffect(() => () => clearLocalPreviewUrl(previewUrlRef), []);

  function handleDemoFileChange(nextFile: File | null) {
    clearLocalPreviewUrl(previewUrlRef);
    setFileName(nextFile?.name ?? "");
    setEstimated(false);

    if (nextFile) {
      const nextPreviewUrl = URL.createObjectURL(nextFile);
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }

  return (
    <Card size="sm" className="glass-card transition-all duration-300">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Photo calories</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Try the first step of the loop in preview.
          </p>
        </div>
        <Sparkles className="text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <PhotoCapturePicker
          compact
          emptyDescription="Take a new photo or choose one from your gallery."
          emptyTitle="Add meal photo"
          previewAlt={fileName || "Meal preview"}
          previewUrl={previewUrl}
          onFileChange={handleDemoFileChange}
        />
        <Button className="h-10" onClick={() => setEstimated(true)}>
          <Plus data-icon="inline-start" />
          Estimate calories
        </Button>
        {estimated ? (
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Demo estimate</div>
                <div className="text-lg font-semibold">Home meal plate</div>
              </div>
              <Badge>540 kcal</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <CalorieMetric label="Protein" value="24g" />
              <CalorieMetric label="Carbs" value="62g" />
              <CalorieMetric label="Fat" value="18g" />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function clearLocalPreviewUrl(ref: MutableRefObject<string | null>) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = null;
  }
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2 sm:col-span-2">
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
        <div className="overflow-hidden rounded-lg border">
          {activeHabits.map((habit) => {
            const Icon = habitIcons[habit.iconKey];
            const isComplete = completedHabitIds.includes(habit.id);

            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 border-b p-3 last:border-b-0"
              >
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    habitColorClass[habit.color]
                  )}
                >
                  <Icon />
                </div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {habit.name}
                </div>
                <div
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border",
                    isComplete && "border-primary bg-primary text-primary-foreground"
                  )}
                >
                  <Checkbox
                    checked={isComplete}
                    onCheckedChange={(checked) =>
                      void onToggleHabit(habit.id, checked === true)
                    }
                  />
                </div>
                <ChevronRight className="text-muted-foreground" />
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
          <div className="flex items-center gap-1 rounded-md bg-muted/60 p-0.5 border border-border/40">
            {(["7d", "30d", "90d", "all"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold transition-all duration-200",
                  range === r
                    ? "bg-background text-foreground shadow-sm scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {r === "all" ? "All" : r.toUpperCase()}
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

function formatWeeklyTrendSpeed(value: number | null) {
  if (value == null) {
    return "-- / wk";
  }

  const prefix = value <= 0 ? "-" : "+";

  return `${prefix}${Math.abs(value).toFixed(2)} kg/wk`;
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
    <Card className="xl:min-h-full glass-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
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
