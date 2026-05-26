"use client";

import { useEffect, type TouchEvent } from "react";
import { BarChart3, Camera, Flame, Plus, Settings } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppProviderConfig } from "@/components/app/root-providers";
import { DemoCaloriePhotoCard } from "@/components/steadycut/demo-calorie-photo-card";
import { PhotoLoggingWorkspace } from "@/components/steadycut/photo-logging-workspace";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const appRoutePrefixes = [
  "/dashboard",
  "/check-ins",
  "/coach",
  "/goals",
  "/habits",
  "/insights",
  "/progress",
  "/settings",
];

const mobileNavItems = [
  { label: "Today", href: "/dashboard", icon: Flame },
  { label: "Food", href: "/coach", icon: Camera },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileAppChrome() {
  const pathname = usePathname();
  const isAppRoute = appRoutePrefixes.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );

  if (!isAppRoute) {
    return null;
  }

  return <MobileBottomNav />;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    for (const item of mobileNavItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  function warmRoute(href: string) {
    router.prefetch(href);
  }

  function handleTouchStart(_event: TouchEvent<HTMLAnchorElement>, href: string) {
    warmRoute(href);
  }

  return (
    <nav
      aria-label="Mobile primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgb(15_23_42/0.08)] backdrop-blur lg:hidden"
    >
      <div className="relative mx-auto grid max-w-md grid-cols-4 gap-1">
        {mobileNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "block rounded-lg text-xs font-medium text-muted-foreground transition-colors active:bg-primary/15",
                isActive && "text-primary"
              )}
              href={item.href}
              prefetch
              scroll={false}
              onMouseEnter={() => warmRoute(item.href)}
              onTouchStart={(event) => handleTouchStart(event, item.href)}
            >
              <MobileBottomNavItemContent isActive={isActive} item={item} />
            </Link>
          );
        })}
        <QuickLogSheet />
      </div>
    </nav>
  );
}

function MobileBottomNavItemContent({
  isActive,
  item,
}: {
  isActive: boolean;
  item: (typeof mobileNavItems)[number];
}) {
  const { pending } = useLinkStatus();
  const isSelected = isActive || pending;

  return (
    <span
      className={cn(
        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-2 transition-colors",
        isSelected && "bg-primary/10 text-primary"
      )}
    >
      <item.icon className={cn(pending && "animate-pulse")} />
      <span>{item.label}</span>
    </span>
  );
}

function QuickLogSheet() {
  const { hasClerk, hasConvex } = useAppProviderConfig();
  const canUseLiveLogging = hasClerk && hasConvex;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Open quick log"
          className="absolute left-1/2 top-0 z-10 size-14 -translate-x-1/2 -translate-y-7 rounded-full border-4 border-background shadow-lg"
          size="icon"
          type="button"
        >
          <Plus className="size-6" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="max-h-[88svh] overflow-y-auto rounded-t-2xl p-0 glass-card bg-transparent border-t border-white/10 dark:border-white/5"
        side="bottom"
      >
        <SheetHeader className="border-b pr-14">
          <SheetTitle>Quick log</SheetTitle>
          <SheetDescription>
            Add food, drink volume, or a scale photo without leaving the daily view.
          </SheetDescription>
        </SheetHeader>
        <div className="p-4">
          {canUseLiveLogging ? (
            <PhotoLoggingWorkspace compact focus="all" showRecentLogs={false} />
          ) : (
            <div className="flex flex-col gap-3">
              <DemoCaloriePhotoCard />
              <Button asChild variant="outline">
                <Link href="/check-ins">Open scale check-ins</Link>
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
