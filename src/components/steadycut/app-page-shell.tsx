"use client";

import { Calendar, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import {
  DesktopAppSidebar,
  MobileHeaderLogo,
  MobileNavButton,
} from "@/components/steadycut/app-sidebar";
import { ThemeIconButton } from "@/components/steadycut/theme-controls";
import { Separator } from "@/components/ui/separator";
import { formatDisplayDate, toDateKey } from "@/lib/steadycut";

type AppPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  streak?: number;
  rightLabel?: string;
};

export function AppPageShell({
  title,
  subtitle,
  children,
  streak = 0,
  rightLabel = "Preview mode",
}: AppPageShellProps) {
  const today = toDateKey();

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <DesktopAppSidebar streak={streak} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8 relative">
          <div className="flex min-w-0 items-center gap-3">
            <MobileNavButton streak={streak} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{title}</h1>
              <p className="hidden truncate text-sm text-muted-foreground md:block">
                {subtitle}
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
              <span>{rightLabel}</span>
            </div>
            <ThemeIconButton className="shrink-0" />
          </div>
        </header>
        <main className="flex flex-col gap-4 p-4 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:p-5 lg:pb-5">
          {children}
        </main>
      </div>
    </div>
  );
}
