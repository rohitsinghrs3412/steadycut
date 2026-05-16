"use client";

import {
  BarChart3,
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
  { label: "Progress", href: "/progress", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function DesktopAppSidebar({ streak = 0 }: { streak?: number }) {
  return (
    <aside className="hidden min-h-screen border-r bg-sidebar lg:flex lg:flex-col">
      <AppSidebarContent streak={streak} />
    </aside>
  );
}

export function MobileNavButton({ streak = 0 }: { streak?: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="lg:hidden" size="icon" variant="outline">
          <Menu />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader>
          <SheetTitle className="sr-only">SteadyCut navigation</SheetTitle>
        </SheetHeader>
        <AppSidebarContent streak={streak} />
      </SheetContent>
    </Sheet>
  );
}

export function AppSidebarContent({ streak = 0 }: { streak?: number }) {
  const pathname = usePathname();
  const { dashboard } = useDashboardQuery();
  const { hasClerk } = useAppProviderConfig();
  const profileName = dashboard?.profile?.displayName?.trim();

  return (
    <div className="flex h-full flex-col p-5">
      <Link className="flex items-center gap-3" href="/dashboard">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Flame />
        </div>
        <div className="text-xl font-semibold text-sidebar-foreground">
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
                "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                isActive &&
                  "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
              )}
              href={item.href}
            >
              <item.icon />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Flame />
            </div>
            <div>
              <div className="text-2xl font-semibold leading-none text-primary">
                {streak}
              </div>
              <div className="text-sm text-muted-foreground">day streak</div>
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
    <div className="rounded-lg border bg-card p-3">
      <button
        className="flex w-full items-center gap-3 rounded-md text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
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
          className="h-8"
          disabled={!isLoaded}
          size="sm"
          type="button"
          variant="outline"
          onClick={handleOpenProfile}
        >
          <UserRound data-icon="inline-start" />
          Profile
        </Button>
        <Button
          className="h-8"
          disabled={!isLoaded || !isSignedIn}
          size="sm"
          type="button"
          variant="ghost"
          onClick={handleSignOut}
        >
          <LogOut data-icon="inline-start" />
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
      className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/60"
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
    <div className="min-w-0">
      <div className="truncate text-sm font-semibold">{name}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
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
