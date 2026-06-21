"use client";

import { Lightbulb, Target } from "lucide-react";

import { AppPageShell } from "@/components/steadycut/app-page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { SectionProps, SetupAlert, SetupOnlySection } from "./shared";

export function StaticSectionPage({
  icon: Icon,
  missingItems = [],
  subtitle,
  title,
}: {
  icon: typeof Target;
  missingItems?: string[];
  subtitle: string;
  title: string;
}) {
  return (
    <AppPageShell subtitle={subtitle} title={title}>
      <SetupAlert missingItems={missingItems} />
      <Card>
        <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </CardContent>
      </Card>
    </AppPageShell>
  );
}

export function InsightsSectionPage({ mode, missingItems }: SectionProps) {
  if (mode === "setup") {
    return <SetupOnlySection missingItems={missingItems} title="Insights" />;
  }

  return (
    <StaticSectionPage
      icon={Lightbulb}
      missingItems={mode === "demo" ? missingItems : []}
      subtitle="Patterns from check-ins, meal estimates, and weigh-ins will collect here."
      title="Insights"
    />
  );
}
