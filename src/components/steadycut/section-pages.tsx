"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarCheck,
  Check,
  Clock,
  Flame,
  Goal,
  Lightbulb,
  Pencil,
  Plus,
  Scale,
  Sparkles,
  Target,
  TrendingDown,
  Trash2,
  Utensils,
  Smile,
  Meh,
  Frown,
  Award,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { DemoCaloriePhotoCard } from "@/components/steadycut/demo-calorie-photo-card";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import {
  habitColorClass,
  habitColorOptions,
  habitIconOptions,
  habitIcons,
} from "@/components/steadycut/habit-presentation";
import { PhotoLoggingWorkspace } from "@/components/steadycut/photo-logging-workspace";
import { ProfileSettingsPanel } from "@/components/steadycut/profile-settings-panel";
import { AppearanceSettingsPanel } from "@/components/steadycut/theme-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckIn,
  createDemoDashboardData,
  DashboardData,
  formatDisplayDate,
  formatShortDate,
  formatWeight,
  formatWeeklyTrendSpeed,
  getCalorieStats,
  getDashboardStats,
  getWeightGoalProgress,
  getWeightGoalSummary,
  Habit,
  HabitIconKey,
  HydrationLog,
  MealLog,
  MealType,
  moodOptions,
  ProfileInput,
  ScaleTimeOfDay,
  toDateKey,
  type UserProfile,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

type AppMode = "demo" | "live" | "setup";

type SectionProps = {
  mode: AppMode;
  missingItems: string[];
  vapidPublicKey?: string;
};

function SetupOnlySection({
  missingItems,
  title,
}: {
  missingItems: string[];
  title: string;
}) {
  return (
    <AppPageShell
      rightLabel="Setup required"
      subtitle="Live mode is enabled, but private app services are incomplete."
      title={title}
    >
      <SetupAlert missingItems={missingItems} />
    </AppPageShell>
  );
}

export function CheckInsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Check-ins" />;
  }

  if (mode === "demo") {
    return <DemoCheckInsSection missingItems={missingItems} />;
  }

  return <LiveCheckInsSection />;
}

export function CoachSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Food" />;
  }

  if (mode === "demo") {
    return <DemoFoodSection missingItems={missingItems} />;
  }

  return (
    <AppPageShell
      rightLabel="Live estimates"
      subtitle="Meal photo estimates, follow-up questions, and practical coaching."
      title="Food"
    >
      <Alert className="border-dashed">
        <Sparkles />
        <AlertTitle>Food estimates are deliberately cautious</AlertTitle>
        <AlertDescription>
          Add grams, oil/ghee level, and dish names whenever you can. The coach
          will ask one follow-up question when the photo is not enough.
        </AlertDescription>
      </Alert>
      <PhotoLoggingWorkspace focus="meal" />
    </AppPageShell>
  );
}

export function ProgressSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Progress" />;
  }

  if (mode === "demo") {
    return <DemoProgressSection missingItems={missingItems} />;
  }

  return <LiveProgressSection />;
}

export function HabitsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Habits" />;
  }

  if (mode === "demo") {
    return <DemoHabitsSection missingItems={missingItems} />;
  }

  return <LiveHabitsSection />;
}

function DemoCheckInsSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();
  const stats = getDashboardStats(data);

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel="Preview mode"
      subtitle="Demo scale logs, notes, and consistency."
      title="Check-ins"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={Scale}
          label="Latest weight"
          value={stats.latest ? `${stats.latest.weight.toFixed(1)} kg` : "--"}
        />
        <StatCard
          icon={CalendarCheck}
          label="This week"
          value={`${stats.checkInsThisWeek} / 7`}
        />
        <StatCard icon={Target} label="Streak" value={`${stats.streak} days`} />
      </div>
      <RecentCheckInsList checkIns={stats.sortedCheckIns.slice(-12).reverse()} />
    </AppPageShell>
  );
}

function DemoFoodSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();
  const calories = getCalorieStats(data);

  return (
    <AppPageShell
      rightLabel="Preview mode"
      subtitle="Add a meal photo, estimate calories, and see what is left today."
      title="Food"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <DemoCaloriePhotoCard />
        <Card>
          <CardHeader>
            <CardTitle>Today from demo meals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-3xl font-semibold">
                  {Math.round(calories.consumed).toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {Math.round(calories.targetCalories).toLocaleString("en-IN")} kcal
                </div>
              </div>
              <Progress value={calories.percent} />
            </div>
            <div className="grid gap-3">
              {calories.todaysMeals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{meal.foodName}</div>
                    <div className="text-sm text-muted-foreground">
                      {meal.mealType}
                    </div>
                  </div>
                  <Badge>{Math.round(meal.calories)} kcal</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppPageShell>
  );
}

function DemoProgressSection({ missingItems }: { missingItems: string[] }) {
  return (
    <ProgressOverview
      data={createDemoDashboardData()}
      missingItems={missingItems}
      rightLabel="Preview mode"
    />
  );
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

export function StaticSectionPage({
  icon: Icon,
  missingItems = [],
  subtitle,
  title,
}: {
  icon: typeof Target;
  missingItems?: string[];
  subtitle: string;
  title: string;
}) {
  return (
    <AppPageShell subtitle={subtitle} title={title}>
      <SetupAlert missingItems={missingItems} />
      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    </AppPageShell>
  );
}

export function InsightsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Insights" />;
  }

  return (
    <StaticSectionPage
      icon={Lightbulb}
      missingItems={mode === "demo" ? missingItems : []}
      subtitle="Patterns from check-ins, meal estimates, and weigh-ins will collect here."
      title="Insights"
    />
  );
}

export function GoalsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Goals" />;
  }

  if (mode === "demo") {
    return <DemoGoalsSection missingItems={missingItems} />;
  }

  return <LiveGoalsSection />;
}

function DemoGoalsSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();

  return (
    <GoalsOverview
      data={data}
      missingItems={missingItems}
      setupLabel="Demo goals"
    />
  );
}

function LiveGoalsSection() {
  const { dashboard } = useDashboardQuery();

  if (!dashboard) {
    return <SectionSkeleton title="Goals" />;
  }

  return (
    <GoalsOverview
      data={mapDashboardData(dashboard)}
      setupLabel="Goal plan"
    />
  );
}

function GoalsOverview({
  data,
  missingItems = [],
  setupLabel,
}: {
  data: DashboardData;
  missingItems?: string[];
  setupLabel: string;
}) {
  const stats = getDashboardStats(data);
  const calories = getCalorieStats(data);
  const targetCalories = data.profile?.targetCalories ?? calories.targetCalories;
  const targetWeight = data.profile?.targetWeightKg;
  const currentWeight = stats.latest?.weight;
  const startWeight = stats.first?.weight;
  const weightProgress = getWeightGoalProgress(startWeight, currentWeight, targetWeight);
  const remainingWeight =
    currentWeight != null && targetWeight != null
      ? Math.max(currentWeight - targetWeight, 0)
      : null;
  const dailyHabitNames = stats.activeHabits
    .filter((habit) => habit.targetCadence === "daily")
    .slice(0, 3)
    .map((habit) => habit.name);

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={setupLabel}
      subtitle="Your calorie budget, target weight, and current distance to goal."
      title="Goals"
    >
      <SetupAlert missingItems={missingItems} />

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Daily calorie goal"
          value={`${Math.round(targetCalories).toLocaleString("en-IN")} kcal`}
        />
        <StatCard
          icon={Goal}
          label="Goal weight"
          value={targetWeight ? `${targetWeight.toFixed(1)} kg` : "Set target"}
        />
        <StatCard
          icon={Scale}
          label="Current weight"
          value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "No logs"}
        />
        <StatCard
          icon={TrendingDown}
          label="Remaining"
          value={
            remainingWeight == null
              ? "Add weight goal"
              : remainingWeight === 0
                ? "At goal"
                : `${remainingWeight.toFixed(1)} kg`
          }
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Weight goal progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">
                  {weightProgress == null
                    ? "--"
                    : `${Math.round(weightProgress)}%`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {getWeightGoalSummary(startWeight, currentWeight, targetWeight)}
                </div>
              </div>
              <Button asChild variant="outline">
                <Link href="/settings">Edit goals</Link>
              </Button>
            </div>
            <Progress value={weightProgress ?? 0} />
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <GoalMeta label="Start" value={formatWeight(startWeight)} />
              <GoalMeta label="Now" value={formatWeight(currentWeight)} />
              <GoalMeta label="Target" value={formatWeight(targetWeight)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today against calories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <div className="text-3xl font-semibold">
                  {Math.round(calories.consumed).toLocaleString("en-IN")}
                </div>
                <div className="text-sm text-muted-foreground">
                  of {Math.round(targetCalories).toLocaleString("en-IN")} kcal
                </div>
              </div>
              <Progress value={calories.percent} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <GoalMeta
                label={calories.remaining >= 0 ? "Left today" : "Over by"}
                value={`${Math.abs(Math.round(calories.remaining)).toLocaleString("en-IN")} kcal`}
              />
              <GoalMeta
                label="Meals logged"
                value={`${calories.todaysMeals.length}`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simple operating targets</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <GoalMeta
            label="This week"
            value={`${stats.checkInsThisWeek} / 7 check-ins`}
          />
          <GoalMeta label="Streak" value={`${stats.streak} days`} />
          <GoalMeta
            label="Daily basics"
            value={dailyHabitNames.length > 0 ? dailyHabitNames.join(", ") : "Add habits"}
          />
        </CardContent>
      </Card>
    </AppPageShell>
  );
}

export function SettingsSectionPage({
  mode,
  missingItems,
  vapidPublicKey = "",
}: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Settings" />;
  }

  if (mode === "demo") {
    return <DemoSettingsSection missingItems={missingItems} />;
  }

  return <LiveSettingsSection vapidPublicKey={vapidPublicKey} />;
}

function DemoSettingsSection({ missingItems }: { missingItems: string[] }) {
  async function saveProfile() {
    return;
  }

  async function saveWeight() {
    return;
  }

  return (
    <AppPageShell
      rightLabel="Profile"
      subtitle="Height, weight, ancestry, and calorie target."
      title="Settings"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ProfileSettingsPanel
            latestWeightKg={75.2}
            onSaveProfile={saveProfile}
            onSaveWeight={saveWeight}
            profile={{
              displayName: "Rohit",
              heightCm: 174,
              sex: "male",
              ancestry: "south-asian",
              targetCalories: 1800,
              targetWeightKg: 72,
            }}
          />
        </div>
        <div className="flex flex-col gap-6">
          <AppearanceSettingsPanel />
        </div>
      </div>
    </AppPageShell>
  );
}

function LiveSettingsSection({ vapidPublicKey }: { vapidPublicKey: string }) {
  const { dashboard } = useDashboardQuery();
  const saveProfileMutation = useMutation(api.profiles.upsertProfile);
  const saveCheckInMutation = useMutation(api.checkIns.upsertCheckIn);

  if (!dashboard) {
    return <SectionSkeleton title="Settings" />;
  }

  const data = mapDashboardData(dashboard);
  const stats = getDashboardStats(data);

  async function saveProfile(input: ProfileInput) {
    await saveProfileMutation(input);
  }

  async function saveWeight(weight: number) {
    await saveCheckInMutation({
      date: toDateKey(),
      weight,
      note: stats.todayCheckIn?.note,
      mood: stats.todayCheckIn?.mood ?? "good",
      completedHabitIds: (stats.todayCheckIn?.completedHabitIds ??
        stats.activeHabits.map((habit) => habit.id)) as Id<"habits">[],
    });
  }

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel="Profile"
      subtitle="Height, weight, ancestry, and calorie target."
      title="Settings"
    >
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ProfileSettingsPanel
            latestWeightKg={stats.latest?.weight}
            onSaveProfile={saveProfile}
            onSaveWeight={saveWeight}
            profile={data.profile}
          />
        </div>
        <div className="flex flex-col gap-6">
          <AppearanceSettingsPanel />
          <DailyReminderPanel vapidPublicKey={vapidPublicKey} />
        </div>
      </div>
    </AppPageShell>
  );
}

function DailyReminderPanel({ vapidPublicKey }: { vapidPublicKey: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const subscription = useQuery(
    api.pushNotifications.getCurrentSubscription,
    isLoaded && isSignedIn ? {} : "skip"
  );
  const upsertSubscription = useMutation(api.pushNotifications.upsertSubscription);
  const deleteSubscription = useMutation(api.pushNotifications.deleteSubscription);
  const updateReminderHour = useMutation(api.pushNotifications.updateReminderHour);
  const sendTest = useAction(api.pushActions.sendTest);
  const [selectedHour, setSelectedHour] = useState("7");
  const [status, setStatus] = useState<
    "idle" | "enabling" | "saving" | "testing" | "disabled" | "error" | "sent"
  >("idle");
  const reminderHour = String(subscription?.reminderHourLocal ?? selectedHour);
  const isEnabled = Boolean(subscription);
  const canUseNotifications =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  async function handleEnable() {
    setStatus("enabling");

    try {
      if (!vapidPublicKey) {
        throw new Error("Missing VAPID public key.");
      }

      if (!canUseNotifications) {
        throw new Error("Push notifications are not supported here.");
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus("disabled");
        return;
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        }));
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const serialized = pushSubscription.toJSON();

      if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) {
        throw new Error("Browser did not return a full push subscription.");
      }

      await upsertSubscription({
        endpoint: serialized.endpoint,
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
        reminderHourLocal: Number(reminderHour),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleDisable() {
    setStatus("saving");

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const pushSubscription =
        await registration?.pushManager.getSubscription();

      await pushSubscription?.unsubscribe();
      await deleteSubscription();
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleHourChange(value: string) {
    setSelectedHour(value);

    if (!subscription) {
      return;
    }

    setStatus("saving");

    try {
      await updateReminderHour({ reminderHourLocal: Number(value) });
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function handleSendTest() {
    setStatus("testing");

    try {
      await sendTest({});
      setStatus("sent");
      window.setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Daily reminder</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Web push works on Android Chrome and installed iOS PWAs.
          </p>
        </div>
        <Bell className="text-primary" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
          <div className="flex flex-col gap-2">
            <Label>Reminder time</Label>
            <Select value={reminderHour} onValueChange={handleHourChange}>
              <SelectTrigger className="w-full">
                <Clock data-icon="inline-start" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Array.from({ length: 24 }, (_, hour) => (
                    <SelectItem key={hour} value={String(hour)}>
                      {formatHour(hour)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Button
              disabled={status === "enabling" || status === "saving"}
              onClick={isEnabled ? handleDisable : handleEnable}
              variant={isEnabled ? "outline" : "default"}
            >
              {status === "enabling"
                ? "Enabling..."
                : isEnabled
                  ? "Disable"
                  : "Enable"}
            </Button>
          </div>
        </div>

        <Button
          disabled={!isEnabled || status === "testing"}
          type="button"
          variant="secondary"
          onClick={handleSendTest}
        >
          {status === "testing"
            ? "Sending..."
            : status === "sent"
              ? "Sent"
              : "Send test"}
        </Button>

        {status === "disabled" ? (
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. Enable them in the browser or system settings.
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm font-medium text-destructive">
            Reminder setup failed. Check notification permission and VAPID keys.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LiveCheckInsSection() {
  const { dashboard } = useDashboardQuery();

  if (!dashboard) {
    return <SectionSkeleton title="Check-ins" />;
  }

  const data = mapDashboardData(dashboard);
  const stats = getDashboardStats(data);

  return (
    <AppPageShell
      streak={stats.streak}
      subtitle="Log scale photos, daily check-ins, and recent kg readings."
      title="Check-ins"
    >
      <PhotoLoggingWorkspace focus="scale" />
      <RecentCheckInsList checkIns={stats.sortedCheckIns.slice(-12).reverse()} />
    </AppPageShell>
  );
}

function LiveProgressSection() {
  const { dashboard } = useDashboardQuery();

  if (!dashboard) {
    return <SectionSkeleton title="Progress" />;
  }

  return <ProgressOverview data={mapDashboardData(dashboard)} rightLabel="Progress" />;
}

function ProgressOverview({
  data,
  missingItems = [],
  rightLabel,
}: {
  data: DashboardData;
  missingItems?: string[];
  rightLabel: string;
}) {
  const stats = useMemo(() => getDashboardStats(data), [data]);
  const latest = stats.latest?.weight;
  const latestTrend = stats.weightTrend.latestTrendWeight;
  const weeklySpeed = stats.weightTrend.weeklySpeed;
  const progressValue = Math.min((stats.checkInsThisMonth / 30) * 100, 100);

  // 1. Timeframe state for Chart
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const chartData = useMemo(() => {
    const pts = stats.weightTrend.points;
    if (timeframe === '7d') return pts.slice(-7);
    if (timeframe === '30d') return pts.slice(-30);
    if (timeframe === '90d') return pts.slice(-90);
    return pts;
  }, [stats, timeframe]);

  const trendData = useMemo(() => {
    return chartData.map((point) => ({
      date: point.date,
      label: formatShortDate(point.date),
      weight: point.weight,
      trendWeight: point.trendWeight,
    }));
  }, [chartData]);

  // 2. Weekly loop check-in row
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + index);
      const dateKey = toDateKey(d);
      const checkIn = stats.sortedCheckIns.find((c) => c.date === dateKey);
      const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 3);
      const dayNum = d.getDate();
      
      return {
        dateKey,
        dayLabel,
        dayNum,
        checkIn,
      };
    });
  }, [stats]);

  const moodTheme = {
    great: { bg: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20", icon: Smile, label: "Great" },
    good: { bg: "bg-blue-500/20 text-blue-600 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20", icon: Smile, label: "Good" },
    flat: { bg: "bg-amber-500/20 text-amber-600 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20", icon: Meh, label: "Flat" },
    hard: { bg: "bg-rose-500/20 text-rose-600 border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20", icon: Frown, label: "Hard" },
  };

  // 3. Habit consistency in last 30 check-ins
  const last30CheckIns = useMemo(() => {
    return stats.sortedCheckIns.slice(-30);
  }, [stats]);

  const habitConsistency = useMemo(() => {
    const total = last30CheckIns.length;
    if (total === 0) return [];
    
    return stats.activeHabits.map((habit) => {
      const completedCount = last30CheckIns.filter((checkIn) =>
        checkIn.completedHabitIds.includes(habit.id)
      ).length;
      const rate = Math.round((completedCount / total) * 100);
      return {
        ...habit,
        completedCount,
        total,
        rate,
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [stats, last30CheckIns]);

  // 4. Longest check-in streak
  const longestStreak = useMemo(() => {
    const dates = Array.from(new Set(stats.sortedCheckIns.map(c => c.date))).sort();
    if (dates.length === 0) return 0;
    
    let maxStreak = 0;
    let currentStreak = 0;
    let prevDate: Date | null = null;
    
    for (const dateStr of dates) {
      const currentDate = new Date(`${dateStr}T12:00:00`);
      if (prevDate === null) {
        currentStreak = 1;
      } else {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak += 1;
        } else if (diffDays > 1) {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
      prevDate = currentDate;
    }
    return Math.max(maxStreak, currentStreak);
  }, [stats]);

  // 5. Calorie & Macro averages
  const mealAverages = useMemo(() => {
    if (!data.mealLogs || data.mealLogs.length === 0) return null;
    
    const dateMap: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {};
    data.mealLogs.forEach((log) => {
      if (!dateMap[log.date]) {
        dateMap[log.date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dateMap[log.date].calories += log.calories;
      dateMap[log.date].protein += log.proteinGrams ?? 0;
      dateMap[log.date].carbs += log.carbsGrams ?? 0;
      dateMap[log.date].fat += log.fatGrams ?? 0;
    });
    
    const dates = Object.keys(dateMap);
    const totalDays = dates.length;
    if (totalDays === 0) return null;
    
    const totalCalories = dates.reduce((sum, d) => sum + dateMap[d].calories, 0);
    const totalProtein = dates.reduce((sum, d) => sum + dateMap[d].protein, 0);
    const totalCarbs = dates.reduce((sum, d) => sum + dateMap[d].carbs, 0);
    const totalFat = dates.reduce((sum, d) => sum + dateMap[d].fat, 0);
    
    const avgCalories = Math.round(totalCalories / totalDays);
    const avgProtein = Math.round(totalProtein / totalDays);
    const avgCarbs = Math.round(totalCarbs / totalDays);
    const avgFat = Math.round(totalFat / totalDays);
    
    const targetCalories = data.profile?.targetCalories ?? 1800;
    const complianceDays = dates.filter((d) => dateMap[d].calories <= targetCalories).length;
    const complianceRate = Math.round((complianceDays / totalDays) * 100);
    
    return {
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      totalDays,
      complianceRate,
      targetCalories,
    };
  }, [data.mealLogs, data.profile]);

  const chartConfig = {
    weight: {
      label: "Weight",
      color: "var(--chart-1)",
    },
    trendWeight: {
      label: "7-day trend",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  // Start weight vs latest weight delta
  const rawDelta = stats.latest && stats.first ? stats.latest.weight - stats.first.weight : 0;

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={rightLabel}
      subtitle="Detailed weight trends, habit tracking, and calorie averages."
      title="Progress"
    >
      <SetupAlert missingItems={missingItems} />

      {/* 2x2 Grid of Stat Cards for Mobile */}
      <div className="grid grid-cols-2 gap-3 lg:gap-6 lg:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Latest weight"
          value={latest ? `${latest.toFixed(1)} kg` : "--"}
          subtext={stats.latest ? `${rawDelta >= 0 ? "+" : ""}${rawDelta.toFixed(1)} kg overall` : "No logs"}
        />
        <StatCard
          icon={TrendingDown}
          label="7D EWMA Trend"
          value={latestTrend ? `${latestTrend.toFixed(1)} kg` : "--"}
          subtext={formatWeeklyTrendSpeed(weeklySpeed, " trend speed")}
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={`${stats.streak} days`}
          subtext={`Longest: ${longestStreak} days`}
        />
        <StatCard
          icon={CalendarCheck}
          label="Consistency"
          value={`${stats.checkInsThisMonth}/30`}
          subtext={`${progressValue.toFixed(0)}% month log rate`}
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left Column (Charts and raw logs) */}
        <div className="flex flex-col gap-6 min-w-0">
          {/* Interactive Timeframe Weight Chart */}
          <Card className="glass-card border-white/10 dark:border-white/5 overflow-hidden">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Weight Trend Analysis</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Plotting raw weight vs 7-day exponentially weighted trend</p>
              </div>
              
              {/* Timeframe buttons */}
              <div className="flex bg-muted/60 p-0.5 rounded-lg w-fit">
                {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all uppercase",
                      timeframe === tf
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="px-1 sm:px-6">
              <ChartContainer
                className="w-full h-[240px] sm:h-[300px] min-h-[240px]"
                config={chartConfig}
              >
                <AreaChart data={trendData} margin={{ left: -10, right: 12, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="progressColorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="progressColorTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/20" />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tickLine={false}
                    tickMargin={8}
                    fontSize={10}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    axisLine={false}
                    domain={["dataMin - 1.5", "dataMax + 1.5"]}
                    tickLine={false}
                    tickMargin={8}
                    fontSize={10}
                    width={30}
                    className="fill-muted-foreground"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(value, payload) => {
                          const item = payload[0]?.payload as { date: string } | undefined;
                          return item ? formatDisplayDate(item.date) : value;
                        }}
                      />
                    }
                    cursor={false}
                  />
                  <Area
                    dataKey="weight"
                    fill="url(#progressColorWeight)"
                    name="Weight"
                    stroke="var(--chart-1)"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    type="monotone"
                  />
                  <Area
                    dataKey="trendWeight"
                    fill="url(#progressColorTrend)"
                    name="7-day trend"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Raw logs list */}
          <RecentCheckInsList checkIns={stats.sortedCheckIns.slice(-10).reverse()} />
        </div>

        {/* Right Column (Consistency statistics & Milestones) */}
        <div className="flex flex-col gap-6">
          {/* Weekly Check-in Loop Grid */}
          <Card className="glass-card border-white/10 dark:border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Weekly Consistency Loop</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Click any missed day to log check-in details</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map(({ dateKey, dayLabel, dayNum, checkIn }) => {
                  const theme = checkIn ? moodTheme[checkIn.mood as keyof typeof moodTheme] : null;
                  const MoodIcon = theme ? theme.icon : null;
                  
                  return (
                    <div key={dateKey} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">{dayLabel}</span>
                      
                      {checkIn ? (
                        <div
                          title={`Logged: ${checkIn.weight.toFixed(1)} kg (${theme?.label})`}
                          className={cn(
                            "flex size-10 items-center justify-center rounded-full border text-xs font-semibold shadow-sm transition-all duration-300 hover:scale-105",
                            theme?.bg
                          )}
                        >
                          {MoodIcon && <MoodIcon className="size-4" />}
                        </div>
                      ) : (
                        <Link
                          href="/check-ins"
                          title="Log this missed day"
                          className="flex size-10 items-center justify-center rounded-full border border-dashed text-muted-foreground/50 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-300 hover:scale-105"
                        >
                          <Plus className="size-4" />
                        </Link>
                      )}
                      
                      <span className="text-xs font-mono font-medium text-foreground">{dayNum}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Habits Consistency Card */}
          <Card className="glass-card border-white/10 dark:border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Habit Consistency</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Success rate over last 30 check-ins</p>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href="/habits">Edit Habits</Link>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {habitConsistency.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">
                  Log check-ins to view habit consistency.
                </div>
              ) : (
                habitConsistency.map((habit) => {
                  const Icon = habitIcons[habit.iconKey];
                  
                  return (
                    <div key={habit.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 font-medium">
                          <div className={cn("p-1.5 rounded bg-primary/10 text-primary", habitColorClass[habit.color])}>
                            <Icon className="size-3.5" />
                          </div>
                          <span className="truncate max-w-[180px] sm:max-w-[240px]">{habit.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {habit.rate}% ({habit.completedCount}/{habit.total})
                        </span>
                      </div>
                      <Progress value={habit.rate} className="h-1.5" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Nutrition Averages (Meal logs summary) */}
          <Card className="glass-card border-white/10 dark:border-white/5">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Nutrition & Calorie Consistency</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Average intake across logged days</p>
            </CardHeader>
            <CardContent>
              {!mealAverages ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <Utensils className="size-8 text-muted-foreground/45" />
                  <p className="text-sm text-muted-foreground">No meal logs logged yet.</p>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/coach">Log Your First Meal</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Calories Budget Card */}
                  <div className="p-3.5 rounded-lg border bg-muted/30">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <div className="text-2xl font-bold tracking-tight">{mealAverages.avgCalories} <span className="text-xs font-normal text-muted-foreground">kcal / day avg</span></div>
                        <div className="text-xs text-muted-foreground mt-0.5">Target: {mealAverages.targetCalories} kcal</div>
                      </div>
                      <Badge variant={mealAverages.avgCalories <= mealAverages.targetCalories ? "default" : "secondary"}>
                        {mealAverages.complianceRate}% days on track
                      </Badge>
                    </div>
                    
                    {/* Calorie compliance progress */}
                    <div className="mt-3 space-y-1">
                      <Progress value={Math.min((mealAverages.avgCalories / mealAverages.targetCalories) * 100, 100)} className="h-2" />
                      <div className="text-[10px] text-muted-foreground text-right">
                        {mealAverages.avgCalories <= mealAverages.targetCalories 
                          ? `${mealAverages.targetCalories - mealAverages.avgCalories} kcal under budget average`
                          : `${mealAverages.avgCalories - mealAverages.targetCalories} kcal over budget average`}
                      </div>
                    </div>
                  </div>

                  {/* Macro Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-secondary/60">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Protein</div>
                      <div className="text-base font-bold font-mono mt-1 text-chart-1">{mealAverages.avgProtein}g</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-secondary/60">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Carbs</div>
                      <div className="text-base font-bold font-mono mt-1 text-chart-3">{mealAverages.avgCarbs}g</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-secondary/60">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase">Fat</div>
                      <div className="text-base font-bold font-mono mt-1 text-chart-5">{mealAverages.avgFat}g</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-center text-muted-foreground italic">
                    Aggregated from {mealAverages.totalDays} days of food diary photography.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consistency Milestones / Personal Achievements */}
          <Card className="glass-card border-white/10 dark:border-white/5 bg-gradient-to-br from-primary/5 via-transparent to-chart-1/5">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Award className="size-5 text-primary" />
                Milestones & Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-white/5">
                <Activity className="size-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Total Weight Change</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.latest && stats.first 
                      ? `You have shed a total of ${Math.abs(rawDelta).toFixed(1)} kg since starting.`
                      : "Start check-ins to trace overall weight changes."}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-white/5">
                <Flame className="size-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Consistency Records</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Longest consecutive logging streak is <strong className="text-foreground">{longestStreak} days</strong>.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPageShell>
  );
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
  const canManage = Boolean(
    onAddHabit && onDeleteHabit && onReorderHabits && onUpdateHabit
  );

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={rightLabel}
      subtitle="The small daily actions that keep the cut steady."
      title="Habits"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Active habits</h2>
          <p className="text-sm text-muted-foreground">
            Daily and weekly basics for the current cut.
          </p>
        </div>
        {canManage ? (
          <HabitEditorSheet
            onSave={async (input) => {
              await onAddHabit?.(input);
            }}
          />
        ) : null}
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {stats.activeHabits.map((habit, index) => {
          const Icon = habitIcons[habit.iconKey];

          return (
            <Card key={habit.id}>
              <CardContent className="flex min-h-44 flex-col justify-between p-5">
                <div className="flex items-center justify-between gap-3">
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      habitColorClass[habit.color]
                    )}
                  >
                    <Icon />
                  </div>
                  <Badge variant="secondary">{habit.targetCadence}</Badge>
                </div>
                <div>
                  <div className="font-semibold">{habit.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-primary">
                    <Check className="size-4" />
                    Active
                  </div>
                </div>
                {canManage ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      aria-label={`Move ${habit.name} up`}
                      disabled={index === 0}
                      size="icon-sm"
                      variant="outline"
                      onClick={() =>
                        void moveHabit(
                          stats.activeHabits,
                          index,
                          -1,
                          onReorderHabits
                        )
                      }
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      aria-label={`Move ${habit.name} down`}
                      disabled={index === stats.activeHabits.length - 1}
                      size="icon-sm"
                      variant="outline"
                      onClick={() =>
                        void moveHabit(
                          stats.activeHabits,
                          index,
                          1,
                          onReorderHabits
                        )
                      }
                    >
                      <ArrowDown />
                    </Button>
                    <HabitEditorSheet
                      habit={habit}
                      onSave={async (input) => {
                        await onUpdateHabit?.(habit.id, input);
                      }}
                    />
                    <Button
                      className="text-destructive hover:text-destructive"
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        void confirmDeleteHabit(habit, onDeleteHabit)
                      }
                    >
                      <Trash2 />
                      <span className="sr-only">Delete {habit.name}</span>
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppPageShell>
  );
}

type HabitFormInput = {
  name: string;
  iconKey: HabitIconKey;
  color: Habit["color"];
  targetCadence: Habit["targetCadence"];
  active: boolean;
};

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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function formatHour(hour: number) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
  }).format(new Date(2026, 0, 1, hour));
}

function SetupAlert({ missingItems }: { missingItems: string[] }) {
  if (missingItems.length === 0) {
    return null;
  }

  return (
    <Alert className="border-dashed">
      <AlertTriangle />
      <AlertTitle>Setup still needed</AlertTitle>
      <AlertDescription>
        Missing:{" "}
        <span className="font-mono text-xs">{missingItems.join(", ")}</span>
      </AlertDescription>
    </Alert>
  );
}

function RecentCheckInsList({ checkIns }: { checkIns: CheckIn[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent daily check-ins</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {checkIns.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            No check-ins yet.
          </div>
        ) : (
          checkIns.map((checkIn) => {
            const mood = moodOptions.find((option) => option.value === checkIn.mood);

            return (
              <div key={checkIn.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {formatDisplayDate(checkIn.date)}
                  </div>
                  <div className="font-mono text-sm">
                    {checkIn.weight.toFixed(1)} kg
                  </div>
                </div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {checkIn.note ?? "No note"}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span>{mood?.label ?? checkIn.mood}</span>
                  <span className="font-medium text-primary">
                    {checkIn.completedHabitIds.length} habits
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <Card className="glass-card spring-bounce border-white/10 dark:border-white/5">
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        </div>
        <div>
          <div className="text-xl font-semibold tracking-tight">{value}</div>
          {subtext && <div className="text-[10px] text-muted-foreground mt-0.5">{subtext}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function GoalMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <AppPageShell subtitle="Loading your private data." title={title}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96" />
    </AppPageShell>
  );
}

function mapDashboardData(dashboard: {
  profile?: ({
    _id: Id<"profiles">;
  } & Omit<NonNullable<UserProfile>, "id">) | null;
  habits: Array<{
    _id: Id<"habits">;
    name: string;
    iconKey: DashboardData["habits"][number]["iconKey"];
    color: DashboardData["habits"][number]["color"];
    targetCadence: DashboardData["habits"][number]["targetCadence"];
    active: boolean;
    sortOrder: number;
  }>;
  checkIns: Array<{
    _id: Id<"checkIns">;
    date: string;
    weight: number;
    note?: string;
    mood: DashboardData["checkIns"][number]["mood"];
    completedHabitIds: Id<"habits">[];
    createdAt: number;
    updatedAt: number;
  }>;
  mealLogs?: Array<{
    _id: Id<"mealLogs">;
    date: string;
    mealType: MealType;
    photoId: Id<"_storage">;
    status?: MealLog["status"];
    description?: string;
    portionGrams?: number;
    foodName: string;
    items: MealLog["items"];
    calories: number;
    proteinGrams?: number;
    carbsGrams?: number;
    fatGrams?: number;
    confidence: number;
    assumptions: string[];
    followUpQuestion?: string;
    createdAt: number;
    updatedAt: number;
  }>;
  scaleLogs?: Array<{
    _id: Id<"scaleLogs">;
    date: string;
    timeOfDay: ScaleTimeOfDay;
    photoId: Id<"_storage">;
    weightKg?: number;
    rawReading?: string;
    confidence: number;
    needsManualReview: boolean;
    note?: string;
    createdAt: number;
  }>;
  hydrationLogs?: Array<{
    _id: Id<"hydrationLogs">;
    date: string;
    photoId: Id<"_storage">;
    beverageName: string;
    containerName: string;
    volumeMl: number;
    confidence: number;
    assumptions: HydrationLog["assumptions"];
    createdAt: number;
    updatedAt: number;
  }>;
}): DashboardData {
  return {
    profile: dashboard.profile
      ? {
          id: dashboard.profile._id,
          displayName: dashboard.profile.displayName,
          heightCm: dashboard.profile.heightCm,
          sex: dashboard.profile.sex,
          ancestry: dashboard.profile.ancestry,
          targetCalories: dashboard.profile.targetCalories,
          targetWeightKg: dashboard.profile.targetWeightKg,
          createdAt: dashboard.profile.createdAt,
          updatedAt: dashboard.profile.updatedAt,
        }
      : null,
    habits: (dashboard.habits ?? []).map((habit) => ({
      id: habit._id,
      name: habit.name,
      iconKey: habit.iconKey,
      color: habit.color,
      targetCadence: habit.targetCadence,
      active: habit.active,
      sortOrder: habit.sortOrder,
    })),
    checkIns: (dashboard.checkIns ?? []).map((checkIn) => ({
      id: checkIn._id,
      date: checkIn.date,
      weight: checkIn.weight,
      note: checkIn.note,
      mood: checkIn.mood,
      completedHabitIds: checkIn.completedHabitIds,
      createdAt: checkIn.createdAt,
      updatedAt: checkIn.updatedAt,
    })),
    mealLogs: dashboard.mealLogs?.map((meal) => ({
      id: meal._id,
      date: meal.date,
      mealType: meal.mealType,
      photoId: meal.photoId,
      status: meal.status,
      description: meal.description,
      portionGrams: meal.portionGrams,
      foodName: meal.foodName,
      items: meal.items,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      carbsGrams: meal.carbsGrams,
      fatGrams: meal.fatGrams,
      confidence: meal.confidence,
      assumptions: meal.assumptions,
      followUpQuestion: meal.followUpQuestion,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    })),
    scaleLogs: dashboard.scaleLogs?.map((log) => ({
      id: log._id,
      date: log.date,
      timeOfDay: log.timeOfDay,
      photoId: log.photoId,
      weightKg: log.weightKg,
      rawReading: log.rawReading,
      confidence: log.confidence,
      needsManualReview: log.needsManualReview,
      note: log.note,
      createdAt: log.createdAt,
    })),
    hydrationLogs: dashboard.hydrationLogs?.map((log) => ({
      id: log._id,
      date: log.date,
      photoId: log.photoId,
      beverageName: log.beverageName,
      containerName: log.containerName,
      volumeMl: log.volumeMl,
      confidence: log.confidence,
      assumptions: log.assumptions,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })),
  };
}
