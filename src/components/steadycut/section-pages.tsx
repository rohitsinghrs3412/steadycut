"use client";

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
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { DemoCaloriePhotoCard } from "@/components/steadycut/dashboard-screen";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
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
  getCalorieStats,
  getDashboardStats,
  Habit,
  HabitIconKey,
  MealLog,
  MealType,
  moodOptions,
  ProfileInput,
  ScaleTimeOfDay,
  toDateKey,
  type UserProfile,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

type AppMode = "demo" | "live";

type SectionProps = {
  mode: AppMode;
  missingItems: string[];
  vapidPublicKey?: string;
};

const habitIcons: Record<HabitIconKey, typeof Utensils> = {
  utensils: Utensils,
  dumbbell: Target,
  droplet: Scale,
  footprints: TrendingDown,
};

const habitIconOptions: Array<{ value: HabitIconKey; label: string }> = [
  { value: "utensils", label: "Food" },
  { value: "dumbbell", label: "Strength" },
  { value: "droplet", label: "Hydration" },
  { value: "footprints", label: "Steps" },
];

const habitColorOptions: Array<{ value: Habit["color"]; label: string }> = [
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
];

const habitColorClass: Record<Habit["color"], string> = {
  green: "bg-primary text-primary-foreground",
  blue: "bg-chart-1 text-white",
  amber: "bg-chart-3 text-foreground",
  violet: "bg-chart-5 text-white",
};

export function CheckInsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode !== "live") {
    return <DemoCheckInsSection missingItems={missingItems} />;
  }

  return <LiveCheckInsSection />;
}

export function CoachSectionPage({ mode, missingItems }: SectionProps) {
  if (mode !== "live") {
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
  if (mode !== "live") {
    return <DemoProgressSection missingItems={missingItems} />;
  }

  return <LiveProgressSection />;
}

export function HabitsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode !== "live") {
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
      {missingItems.length > 0 ? (
        <Alert className="border-dashed">
          <AlertTriangle />
          <AlertTitle>Setup still needed</AlertTitle>
          <AlertDescription>
            Missing:{" "}
            <span className="font-mono text-xs">{missingItems.join(", ")}</span>
          </AlertDescription>
        </Alert>
      ) : null}
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
  if (mode !== "live") {
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
      {missingItems.length > 0 ? (
        <Alert className="border-dashed">
          <AlertTriangle />
          <AlertTitle>Setup still needed</AlertTitle>
          <AlertDescription>
            Missing:{" "}
            <span className="font-mono text-xs">{missingItems.join(", ")}</span>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
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
        <CardContent className="grid gap-3 md:grid-cols-3">
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
  if (mode !== "live") {
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
      {missingItems.length > 0 ? (
        <Alert className="border-dashed">
          <AlertTriangle />
          <AlertTitle>Setup still needed</AlertTitle>
          <AlertDescription>
            Missing:{" "}
            <span className="font-mono text-xs">{missingItems.join(", ")}</span>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex max-w-3xl flex-col gap-4">
        <AppearanceSettingsPanel />
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
      <div className="flex max-w-3xl flex-col gap-4">
        <AppearanceSettingsPanel />
        <DailyReminderPanel vapidPublicKey={vapidPublicKey} />
        <ProfileSettingsPanel
          latestWeightKg={stats.latest?.weight}
          onSaveProfile={saveProfile}
          onSaveWeight={saveWeight}
          profile={data.profile}
        />
      </div>
    </AppPageShell>
  );
}

function DailyReminderPanel({ vapidPublicKey }: { vapidPublicKey: string }) {
  const subscription = useQuery(api.pushNotifications.getCurrentSubscription);
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
  const stats = getDashboardStats(data);
  const latest = stats.latest?.weight;
  const latestTrend = stats.weightTrend.latestTrendWeight;
  const weeklySpeed = stats.weightTrend.weeklySpeed;
  const progressValue = Math.min((stats.checkInsThisMonth / 30) * 100, 100);

  return (
    <AppPageShell
      streak={stats.streak}
      rightLabel={rightLabel}
      subtitle="Weight trend and consistency at a glance."
      title="Progress"
    >
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Scale}
          label="Latest weight"
          value={latest ? `${latest.toFixed(1)} kg` : "--"}
        />
        <StatCard
          icon={TrendingDown}
          label="7-day EWMA"
          value={latestTrend ? `${latestTrend.toFixed(1)} kg` : "--"}
        />
        <StatCard
          icon={TrendingDown}
          label="Weekly trend speed"
          value={formatWeeklyTrendSpeed(weeklySpeed)}
        />
        <StatCard
          icon={CalendarCheck}
          label="This week"
          value={`${stats.checkInsThisWeek} / 7`}
        />
        <StatCard icon={Target} label="Streak" value={`${stats.streak} days`} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Monthly consistency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Check-ins in the last 30 days
            </span>
            <span className="font-medium">{stats.checkInsThisMonth} / 30</span>
          </div>
          <Progress value={progressValue} />
        </CardContent>
      </Card>
      <RecentCheckInsList checkIns={stats.sortedCheckIns.slice(-10).reverse()} />
    </AppPageShell>
  );
}

function formatWeeklyTrendSpeed(value: number | null) {
  if (value == null) {
    return "-- / wk";
  }

  const prefix = value <= 0 ? "-" : "+";

  return `${prefix}${Math.abs(value).toFixed(2)} kg/wk`;
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <SheetContent className="max-h-[88svh] overflow-y-auto p-0" side="bottom">
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
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon />
        </div>
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
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

function formatWeight(weight?: number) {
  return weight ? `${weight.toFixed(1)} kg` : "--";
}

function getWeightGoalProgress(
  startWeight?: number,
  currentWeight?: number,
  targetWeight?: number
) {
  if (startWeight == null || currentWeight == null || targetWeight == null) {
    return null;
  }

  const totalDistance = startWeight - targetWeight;

  if (totalDistance <= 0) {
    return currentWeight <= targetWeight ? 100 : 0;
  }

  return Math.max(
    0,
    Math.min(((startWeight - currentWeight) / totalDistance) * 100, 100)
  );
}

function getWeightGoalSummary(
  startWeight?: number,
  currentWeight?: number,
  targetWeight?: number
) {
  if (targetWeight == null) {
    return "Set a goal weight in settings.";
  }

  if (currentWeight == null || startWeight == null) {
    return "Log a weight check-in to start progress tracking.";
  }

  const remaining = currentWeight - targetWeight;

  if (remaining <= 0) {
    return "You are at or below your goal weight.";
  }

  const lost = startWeight - currentWeight;

  if (lost <= 0) {
    return `${remaining.toFixed(1)} kg left from your current weight.`;
  }

  return `${lost.toFixed(1)} kg down, ${remaining.toFixed(1)} kg left.`;
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
    habits: dashboard.habits.map((habit) => ({
      id: habit._id,
      name: habit.name,
      iconKey: habit.iconKey,
      color: habit.color,
      targetCadence: habit.targetCadence,
      active: habit.active,
      sortOrder: habit.sortOrder,
    })),
    checkIns: dashboard.checkIns.map((checkIn) => ({
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
  };
}
