"use client";

import {
  Calendar,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";

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
import { ThemeIconButton } from "@/components/steadycut/theme-controls";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DashboardData,
  CheckInInput,
  CoachMessage,
  formatDisplayDate,
  getCalorieStats,
  getDashboardStats,
  getHydrationStats,
  HydrationLog,
  toDateKey,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

// Extracted Sub-Components
import { CalorieStatusCard } from "./dashboard/calorie-status-card";
import { HydrationBubbleWidget } from "./dashboard/hydration-bubble-widget";
import { TodayCheckInCard } from "./dashboard/today-checkin-card";
import { DailyCoachCard } from "./dashboard/daily-coach-card";
import { HabitsCard } from "./dashboard/habits-card";
import { RecentCheckInsCard } from "./dashboard/recent-checkins-card";
import { ConsistencyCard } from "./dashboard/consistency-card";
import { MiniMealsSummaryCard } from "./dashboard/mini-meals-summary-card";

type DashboardScreenProps = {
  data: DashboardData;
  mode: "demo" | "live";
  missingItems?: string[];
  onSaveCheckIn: (input: CheckInInput) => Promise<void>;
  onGenerateCoach: (date: string) => Promise<CoachMessage>;
  onLogHydration?: (
    volumeMl: number,
    beverageName: string
  ) => Promise<HydrationLog | void>;
};

const WeightTrendCard = dynamic(
  () => import("./weight-trend-card").then((mod) => mod.WeightTrendCard),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full animate-pulse rounded-lg bg-secondary/50" />
    ),
  }
);

export function DashboardScreen({
  data,
  mode,
  missingItems = [],
  onSaveCheckIn,
  onGenerateCoach,
  onLogHydration,
}: DashboardScreenProps) {
  const today = toDateKey();
  const [mobileTab, setMobileTab] = useState<"summary" | "checkin" | "analytics">("summary");
  const [optimisticHydrationLogs, setOptimisticHydrationLogs] = useState<
    HydrationLog[]
  >([]);

  const stats = useMemo(() => getDashboardStats(data, today), [data, today]);
  const calorieStats = useMemo(
    () => getCalorieStats(data, today, data.profile?.targetCalories ?? 1800),
    [data, today]
  );
  const hydrationLogs = useMemo(() => {
    const savedLogIds = new Set((data.hydrationLogs ?? []).map((log) => log.id));

    return [
      ...(data.hydrationLogs ?? []),
      ...optimisticHydrationLogs.filter((log) => !savedLogIds.has(log.id)),
    ];
  }, [data.hydrationLogs, optimisticHydrationLogs]);
  
  const hydrationStats = useMemo(
    () => getHydrationStats({ ...data, hydrationLogs }, today),
    [data, hydrationLogs, today]
  );

  async function handleQuickAddHydration(volumeMl: number) {
    const optimisticId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`;
    const now = Date.now();
    const newLog: HydrationLog = {
      id: optimisticId,
      date: today,
      beverageName: "Water",
      containerName: "Quick Add",
      volumeMl,
      confidence: 1.0,
      assumptions: ["Logged manually via quick-add buttons."],
      createdAt: now,
      updatedAt: now,
    };
    setOptimisticHydrationLogs((current) => [...current, newLog]);
    if (mode === "live" && onLogHydration) {
      try {
        const savedLog = await onLogHydration(volumeMl, "Water");

        if (savedLog) {
          setOptimisticHydrationLogs((current) =>
            current.map((log) => (log.id === optimisticId ? savedLog : log))
          );
        }
      } catch (error) {
        setOptimisticHydrationLogs((current) =>
          current.filter((log) => log.id !== optimisticId)
        );
        console.error("Failed to log hydration to backend:", error);
      }
    }
  }
  
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

            {/* Sliding Mobile Tabs Control */}
            <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border/40 w-full mb-1">
              {(["summary", "checkin", "analytics"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setMobileTab(tab)}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-xs font-bold transition-all duration-200 capitalize text-center",
                    mobileTab === tab
                      ? "bg-background text-foreground shadow-sm scale-[1.01]"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab === "summary" ? "Summary" : tab === "checkin" ? "Check-in" : "Trends"}
                </button>
              ))}
            </div>

            {/* Tab 1: Summary */}
            {mobileTab === "summary" && (
              <div className="flex flex-col gap-3 animate-page-fade">
                <CalorieStatusCard
                  compact
                  stats={calorieStats}
                  streak={stats.streak}
                />
                <MiniMealsSummaryCard todaysMeals={calorieStats.todaysMeals} />
                <HydrationBubbleWidget
                  compact
                  mode={mode}
                  stats={hydrationStats}
                  onQuickAdd={handleQuickAddHydration}
                />
              </div>
            )}

            {/* Tab 2: Check-In & Habits */}
            {mobileTab === "checkin" && (
              <div className="flex flex-col gap-3 animate-page-fade">
                <TodayCheckInCard
                  activeHabits={stats.activeHabits}
                  latestWeight={stats.latest?.weight ?? 75}
                  onSaveCheckIn={onSaveCheckIn}
                  todayCheckIn={stats.todayCheckIn}
                />
                <HabitsCard
                  activeHabits={stats.activeHabits}
                  completedHabitIds={stats.todayCheckIn?.completedHabitIds ?? []}
                  onToggleHabit={handleToggleHabit}
                />
              </div>
            )}

            {/* Tab 3: Trends & Analytics */}
            {mobileTab === "analytics" && (
              <div className="flex flex-col gap-3 animate-page-fade">
                <WeightTrendCard
                  compact
                  delta={stats.delta}
                  latest={stats.latest}
                  latestTrendWeight={stats.weightTrend.latestTrendWeight}
                  trendData={stats.trendData}
                  weeklySpeed={stats.weightTrend.weeklySpeed}
                  targetWeight={data.profile?.targetWeightKg}
                />
                <RecentCheckInsCard
                  activeHabitCount={stats.activeHabits.length}
                  checkIns={stats.sortedCheckIns}
                />
              </div>
            )}
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
                <HydrationBubbleWidget mode={mode} stats={hydrationStats} onQuickAdd={handleQuickAddHydration} />
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
              <Settings className="size-4" />
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
      <Sparkles className="size-4" />
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
