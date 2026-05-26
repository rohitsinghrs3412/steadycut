"use client";

import {
  BarChart3,
  Bot,
  Camera,
  Flame,
  Home,
  LogOut,
  Menu,
  Settings,
  UserRound,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppProviderConfig } from "@/components/app/root-providers";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Today", href: "/dashboard", icon: Home },
  { label: "Food", href: "/coach", icon: Camera },
  { label: "AI Coach", href: "/live-coach", icon: Bot },
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DesktopAppSidebar({ streak = 0 }: { streak?: number }) {
  return (
    <aside className="sticky top-0 hidden h-screen border-r bg-sidebar lg:flex lg:flex-col">
      <AppSidebarContent streak={streak} />
    </aside>
  );
}

export function MobileNavButton({ streak = 0 }: { streak?: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="lg:hidden h-10 w-10" size="icon" variant="outline">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 glass-card bg-transparent border-r border-white/10 dark:border-white/5 rounded-r-2xl">
        <SheetHeader>
          <SheetTitle className="sr-only">SteadyCut navigation</SheetTitle>
        </SheetHeader>
        <AppSidebarContent streak={streak} />
      </SheetContent>
    </Sheet>
  );
}

export function MobileHeaderLogo() {
  return (
    <Link
      aria-label="SteadyCut home"
      className="absolute left-1/2 top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 lg:hidden"
      href="/dashboard"
    >
      <Flame />
    </Link>
  );
}

export function AppSidebarContent({ streak = 0 }: { streak?: number }) {
  const pathname = usePathname();
  const { dashboard } = useDashboardQuery();
  const { hasClerk } = useAppProviderConfig();
  const profileName = dashboard?.profile?.displayName?.trim();

  return (
    <div className="flex h-full flex-col p-5">
      <Link className="group flex items-center gap-3 transition-transform duration-200 active:scale-[0.98]" href="/dashboard">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
          <Flame />
        </div>
        <div className="text-xl font-semibold text-sidebar-foreground tracking-tight">
          SteadyCut
        </div>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-all hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground active:scale-[0.98]",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-sm"
              )}
              href={item.href}
            >
              <item.icon className="size-4 shrink-0 transition-transform group-hover:scale-110 duration-200" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-4 transition-all hover:bg-sidebar-accent/50">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-[0_0_15px_-3px_oklch(var(--primary)/0.2)] animate-pulse">
              <Flame className="size-5 fill-primary/20" />
            </div>
            <div>
              <div className="text-2xl font-bold leading-none text-primary tracking-tight">
                {streak}
              </div>
              <div className="text-xs text-sidebar-foreground/75 mt-0.5">day streak</div>
            </div>
          </div>
        </div>
        <Separator />
        {hasClerk ? (
          <ClerkAccountFooter profileName={profileName} />
        ) : (
          <FallbackAccountFooter profileName={profileName} />
        )}
      </div>
    </div>
  );
}

function ClerkAccountFooter({ profileName }: { profileName?: string }) {
  const router = useRouter();
  const { openUserProfile, signOut } = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();

  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName =
    profileName ||
    user?.fullName ||
    user?.firstName ||
    user?.username ||
    email ||
    "Your account";
  const accountLabel =
    email ?? (isLoaded && isSignedIn ? "Signed in" : "Not signed in");
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(user?.id ?? displayName);

  function handleOpenProfile() {
    if (isLoaded && isSignedIn) {
      openUserProfile();
      return;
    }

    router.push("/sign-in");
  }

  function handleSignOut() {
    void signOut({ redirectUrl: "/" });
  }

  return (
    <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-3">
      <button
        className="flex w-full items-center gap-3 rounded-md p-1 text-left outline-none transition-colors hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        type="button"
        onClick={handleOpenProfile}
      >
        <AccountAvatar
          colorClassName={avatarColor}
          imageUrl={user?.hasImage ? user.imageUrl : undefined}
          initials={initials}
          name={displayName}
        />
        <AccountText label={accountLabel} name={displayName} />
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          className="h-8 border-sidebar-border/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs"
          disabled={!isLoaded}
          size="sm"
          type="button"
          variant="outline"
          onClick={handleOpenProfile}
        >
          <UserRound className="size-3.5 mr-1" />
          Profile
        </Button>
        <Button
          className="h-8 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs"
          disabled={!isLoaded || !isSignedIn}
          size="sm"
          type="button"
          variant="ghost"
          onClick={handleSignOut}
        >
          <LogOut className="size-3.5 mr-1" />
          Log out
        </Button>
      </div>
    </div>
  );
}

function FallbackAccountFooter({ profileName }: { profileName?: string }) {
  const displayName = profileName || "Preview account";

  return (
    <Link
      className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-3 transition-colors hover:bg-sidebar-accent/50"
      href="/settings"
    >
      <AccountAvatar
        colorClassName={getAvatarColor(displayName)}
        initials={getInitials(displayName)}
        name={displayName}
      />
      <AccountText label="Local preview" name={displayName} />
    </Link>
  );
}

function AccountAvatar({
  colorClassName,
  imageUrl,
  initials,
  name,
}: {
  colorClassName: string;
  imageUrl?: string;
  initials: string;
  name: string;
}) {
  return (
    <Avatar className="size-10" size="lg">
      {imageUrl ? <AvatarImage alt={name} src={imageUrl} /> : null}
      <AvatarFallback className={cn("font-semibold", colorClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function AccountText({ label, name }: { label: string; name: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-xs font-semibold text-sidebar-foreground">{name}</div>
      <div className="truncate text-[10px] text-sidebar-foreground/60">{label}</div>
    </div>
  );
}

function getInitials(value: string) {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return (parts[0]?.slice(0, 1) || "R").toUpperCase();
}

function getAvatarColor(value: string) {
  const colors = [
    "bg-primary/10 text-primary",
    "bg-chart-1/10 text-chart-1",
    "bg-chart-3/20 text-chart-3",
    "bg-chart-5/15 text-chart-5",
  ];
  const index = Array.from(value).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return colors[index % colors.length];
}
