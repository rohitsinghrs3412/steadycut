"use client";

import { useAuth } from "@clerk/nextjs";
import { useAction, useMutation, useQuery } from "convex/react";
import { Bell, Clock } from "lucide-react";
import { useState } from "react";

import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { ProfileSettingsPanel } from "@/components/steadycut/profile-settings-panel";
import { AppearanceSettingsPanel } from "@/components/steadycut/theme-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardQuery } from "@/components/steadycut/dashboard-query-provider";
import { AppPageShell } from "@/components/steadycut/app-page-shell";
import {
  SetupAlert,
  SetupOnlySection,
  SectionSkeleton,
  mapDashboardData,
} from "@/components/steadycut/section-pages";
import {
  ProfileInput,
  getDashboardStats,
  toDateKey,
} from "@/lib/steadycut";

type SectionProps = {
  mode: "demo" | "live" | "setup";
  missingItems: string[];
  vapidPublicKey?: string;
};

export function SettingsSectionPage({
  mode,
  missingItems,
  vapidPublicKey = "",
}: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Settings" />;
  }

  if (mode === "demo") {
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
      <SetupAlert missingItems={missingItems} />
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
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
        <div className="flex flex-col gap-6">
          <AppearanceSettingsPanel />
        </div>
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
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ProfileSettingsPanel
            latestWeightKg={stats.latest?.weight}
            onSaveProfile={saveProfile}
            onSaveWeight={saveWeight}
            profile={data.profile}
          />
        </div>
        <div className="flex flex-col gap-6">
          <AppearanceSettingsPanel />
          <DailyReminderPanel vapidPublicKey={vapidPublicKey} />
        </div>
      </div>
    </AppPageShell>
  );
}

function DailyReminderPanel({ vapidPublicKey }: { vapidPublicKey: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const subscription = useQuery(
    api.pushNotifications.getCurrentSubscription,
    isLoaded && isSignedIn ? {} : "skip"
  );
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
          onClick={handleSendTest}
          type="button"
          variant="secondary"
        >
          {status === "testing" ? "Sending test..." : "Send test alert"}
        </Button>
      </CardContent>
    </Card>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function formatHour(hour: number) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
  }).format(new Date(2026, 0, 1, hour));
}
