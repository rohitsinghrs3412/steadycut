"use client";

import dynamic from "next/dynamic";
import { Scale, CalendarCheck, Target } from "lucide-react";

import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import {
  createDemoDashboardData,
  getDashboardStats,
} from "@/lib/steadycut";
import {
  SectionProps,
  SetupOnlySection,
  SetupAlert,
  StatCard,
  RecentCheckInsList,
  mapDashboardData,
} from "./shared";

const PhotoLoggingWorkspace = dynamic(
  () =>
    import("@/components/steadycut/photo-logging-workspace").then(
      (mod) => mod.PhotoLoggingWorkspace
    ),
  { ssr: false }
);

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
    return <SectionSkeletonWithTitle title="Check-ins" />;
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

// Simple fallback skeleton specifically for this split component
import { Skeleton } from "@/components/ui/skeleton";
function SectionSkeletonWithTitle({ title }: { title: string }) {
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
