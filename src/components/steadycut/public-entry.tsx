"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Camera,
  Flame,
  Ruler,
  Scale,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";

import { PhotoCapturePicker } from "@/components/steadycut/photo-capture-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SetupNotice } from "@/components/steadycut/setup-notice";

type PublicEntryProps = {
  missingItems: string[];
};

const featureCards = [
  {
    title: "Daily check-ins",
    text: "Log weight, habits, notes, and mood in under a minute.",
    icon: CalendarCheck,
  },
  {
    title: "Trend over noise",
    text: "See your 30-day direction without overreacting to one weigh-in.",
    icon: BarChart3,
  },
  {
    title: "Kind accountability",
    text: "Gemini-powered coaching keeps the next action small and honest.",
    icon: Sparkles,
  },
];

export function PublicEntry({ missingItems }: PublicEntryProps) {
  const isConfigured = missingItems.length === 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Flame />
            </span>
            <span className="text-xl">SteadyCut</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild className="hidden sm:inline-flex" variant="ghost">
              <Link href={isConfigured ? "/sign-in" : "/dashboard"}>
                Sign in
              </Link>
            </Button>
            <Button asChild>
              <Link href={isConfigured ? "/sign-up" : "/dashboard"}>
                Open dashboard
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid flex-1 items-start gap-6 py-6 lg:grid-cols-[1fr_440px] lg:items-center lg:gap-10 lg:py-14">
          <div className="flex max-w-2xl flex-col gap-6 lg:gap-8">
            <MobilePurposePreview />
            <div className="flex flex-col gap-5">
              <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-normal text-balance sm:text-5xl">
                Track calories from photos first.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                Open the app, log a meal photo, see calories left, and keep your
                weight trend on track without digging through a crowded dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={isConfigured ? "/sign-up" : "/dashboard"}>
                  Start today
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">Preview dashboard</Link>
              </Button>
            </div>
            {missingItems.length > 0 ? (
              <SetupNotice missingItems={missingItems} compact />
            ) : null}
          </div>

          <Card className="hidden lg:flex">
            <CardHeader>
              <CardTitle>{"Today's loop"}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {featureCards.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-4 rounded-lg border bg-card p-4"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon />
                  </div>
                  <div>
                    <div className="font-medium">{feature.title}</div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {feature.text}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function MobilePurposePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => clearPreviewUrl(previewUrlRef), []);

  function handleFileChange(nextFile: File | null) {
    clearPreviewUrl(previewUrlRef);

    if (nextFile) {
      const nextPreviewUrl = URL.createObjectURL(nextFile);
      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }

  return (
    <Card className="lg:hidden" size="sm">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Calories today</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">980 of 1800 kcal</p>
        </div>
        <Badge>On track</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress className="h-2" value={54} />
        <div className="grid grid-cols-3 gap-2">
          <PreviewMetric icon={Camera} label="Photo" value="Ready" />
          <PreviewMetric icon={Scale} label="Weight" value="75.2 kg" />
          <PreviewMetric icon={Ruler} label="BMI" value="24.8" />
        </div>
        <PhotoCapturePicker
          compact
          emptyDescription="Take a new photo or choose one from your gallery."
          emptyTitle="Add meal photo"
          previewAlt="Meal preview"
          previewUrl={previewUrl}
          onFileChange={handleFileChange}
        />
      </CardContent>
    </Card>
  );
}

function clearPreviewUrl(ref: MutableRefObject<string | null>) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current);
    ref.current = null;
  }
}

function PreviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Camera;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon />
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
