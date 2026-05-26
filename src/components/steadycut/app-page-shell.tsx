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
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <DesktopAppSidebar streak={streak} />
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <MobileNavButton streak={streak} />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
                <p className="hidden truncate text-xs text-muted-foreground md:block mt-0.5">
                  {subtitle}
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
                <span>{rightLabel}</span>
              </div>
              <ThemeIconButton className="shrink-0" />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 flex flex-col gap-6 p-4 pb-[calc(9rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8 lg:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
