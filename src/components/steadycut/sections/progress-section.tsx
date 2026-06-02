"use client";

import {
  Scale,
  TrendingDown,
  Flame,
  CalendarCheck,
  Smile,
  Meh,
  Frown,
  Plus,
  Award,
  Activity,
  Utensils,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import {
  SetupAlert,
  SetupOnlySection,
  SectionSkeleton,
  StatCard,
  RecentCheckInsList,
  mapDashboardData,
} from "@/components/steadycut/section-pages";
import {
  DashboardData,
  formatDisplayDate,
  formatShortDate,
  getDashboardStats,
  formatWeeklyTrendSpeed,
  toDateKey,
  createDemoDashboardData,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";
import { habitIcons, habitColorClass } from "@/components/steadycut/habit-presentation";

type SectionProps = {
  mode: "demo" | "live" | "setup";
  missingItems: string[];
};

export function ProgressSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Progress" />;
  }

  if (mode === "demo") {
    return <DemoProgressSection missingItems={missingItems} />;
  }

  return <LiveProgressSection />;
}

function LiveProgressSection() {
  const { dashboard } = useDashboardQuery();

  if (!dashboard) {
    return <SectionSkeleton title="Progress" />;
  }

  return <ProgressOverview data={mapDashboardData(dashboard)} rightLabel="Progress" />;
}

function DemoProgressSection({ missingItems }: { missingItems: string[] }) {
  const data = createDemoDashboardData();

  return (
    <ProgressOverview
      data={data}
      missingItems={missingItems}
      rightLabel="Preview mode"
    />
  );
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
              <div className="flex bg-muted/60 p-1 rounded-lg w-fit border border-border/40">
                {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={cn(
                      "px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all uppercase text-center min-w-[38px]",
                      timeframe === tf
                        ? "bg-background text-foreground shadow-sm scale-105"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
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
                        labelFormatter={(value: unknown, payload: readonly { payload?: { date: string } }[]) => {
                          const item = payload[0]?.payload;
                          return item ? formatDisplayDate(item.date) : String(value);
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
