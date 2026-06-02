"use client";

import { MessageCircle, Sparkles, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CoachMessage } from "@/lib/steadycut";

export function DailyCoachCard({
  coachMessage,
  isGenerating,
  onGenerate,
}: {
  coachMessage: CoachMessage | null;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
}) {
  return (
    <Card className="xl:flex-1 glass-card transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <CardHeader className="flex-row items-start justify-between">
        <CardTitle>Daily coach</CardTitle>
        <div className="flex items-center gap-2 text-sm font-medium text-chart-1">
          <Sparkles className="size-4" />
          <span>Coach</span>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[520px] flex-col gap-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 text-primary shrink-0" />
          <div className="flex flex-col gap-4">
            <p className="font-medium">
              {coachMessage
                ? "You kept your streak alive. That's the real win."
                : "Ready when you are."}
            </p>
            <p className="leading-7 text-muted-foreground">
              {coachMessage?.insight ??
                "Log today's check-in, then ask the coach for one small action based on your recent trend."}
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-4">
          <div className="font-medium text-chart-1">Next small action</div>
          <div className="flex items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-secondary text-chart-1">
              <Waves className="size-8" />
            </div>
            <div>
              <div className="font-medium">
                {coachMessage?.nextAction ?? "Finish today's check-in."}
              </div>
            </div>
          </div>
        </div>
        <Button
          className="mt-auto h-11"
          disabled={isGenerating}
          onClick={onGenerate}
          variant="outline"
        >
          <MessageCircle data-icon="inline-start" />
          {isGenerating ? "Asking coach..." : "Ask Coach"}
        </Button>
      </CardContent>
    </Card>
  );
}
