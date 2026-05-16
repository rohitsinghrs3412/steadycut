"use client";

import { useState } from "react";

import { DashboardScreen } from "@/components/steadycut/dashboard-screen";
import {
  CheckInInput,
  CoachMessage,
  createDemoDashboardData,
  DashboardData,
} from "@/lib/steadycut";

type DemoDashboardProps = {
  missingItems: string[];
};

export function DemoDashboard({ missingItems }: DemoDashboardProps) {
  const [data, setData] = useState<DashboardData>(() =>
    createDemoDashboardData()
  );

  async function saveCheckIn(input: CheckInInput) {
    setData((current) => {
      const existing = current.checkIns.find(
        (checkIn) => checkIn.date === input.date
      );
      const nextCheckIn = {
        id: existing?.id ?? `demo-${input.date}`,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        ...input,
      };

      return {
        ...current,
        checkIns: existing
          ? current.checkIns.map((checkIn) =>
              checkIn.id === existing.id ? nextCheckIn : checkIn
            )
          : [...current.checkIns, nextCheckIn],
      };
    });
  }

  async function generateCoach(date: string): Promise<CoachMessage> {
    const message: CoachMessage = {
      id: `demo-coach-${date}`,
      date,
      promptSummary: "Preview mode coach response",
      insight:
        "Your consistency is doing the useful work. Today does not need to be impressive; it needs to be logged and kept simple.",
      nextAction: "Log dinner before you eat it.",
      createdAt: Date.now(),
    };

    setData((current) => ({
      ...current,
      coachMessage: message,
    }));

    return message;
  }

  return (
    <DashboardScreen
      data={data}
      missingItems={missingItems}
      mode="demo"
      onGenerateCoach={generateCoach}
      onSaveCheckIn={saveCheckIn}
    />
  );
}
