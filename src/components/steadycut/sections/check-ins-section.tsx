"use client";

import { Scale, Target, CalendarCheck } from "lucide-react";

import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import { PhotoLoggingWorkspace } from "@/components/steadycut/photo-logging-workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckIn,
  formatDisplayDate,
  getDashboardStats,
  moodOptions,
  createDemoDashboardData,
} from "@/lib/steadycut";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import {
  SetupAlert,
  SetupOnlySection,
  SectionSkeleton,
  mapDashboardData,
  StatCard,
} from "@/components/steadycut/section-pages";

type SectionProps = {
  mode: "demo" | "live" | "setup";
  missingItems: string[];
};

export function CheckInsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Check-ins" />;
  }

  if (mode === "demo") {
    return <DemoCheckInsSection missingItems={missingItems} />;
  }

  return <LiveCheckInsSection />;
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
