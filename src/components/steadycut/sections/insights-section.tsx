"use client";

import { Lightbulb } from "lucide-react";

import {
  StaticSectionPage,
  SetupOnlySection,
} from "@/components/steadycut/section-pages";

type SectionProps = {
  mode: "demo" | "live" | "setup";
  missingItems: string[];
};

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
