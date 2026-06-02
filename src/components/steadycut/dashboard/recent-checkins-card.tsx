"use client";

import { MoreVertical, Smile } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckIn,
  formatDisplayDate,
  getPreviousWeightChange,
  Mood,
} from "@/lib/steadycut";
import { cn } from "@/lib/utils";

const moodIcon: Record<Mood, typeof Smile> = {
  great: Smile,
  good: Smile,
  flat: Smile,
  hard: Smile,
};

export function RecentCheckInsCard({
  activeHabitCount,
  checkIns,
}: {
  activeHabitCount: number;
  checkIns: CheckIn[];
}) {
  const recent = [...checkIns].reverse().slice(0, 6);

  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader>
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:hidden">
          {recent.map((checkIn) => {
            const change = getPreviousWeightChange(checkIn, checkIns);

            return (
              <div 
                key={checkIn.id} 
                className="rounded-lg p-4 glass-card spring-bounce border border-border hover:border-primary/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    {formatDisplayDate(checkIn.date)}
                  </div>
                  <div className="font-mono text-sm">
                    {checkIn.weight.toFixed(1)} kg
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 text-muted-foreground">
                    {checkIn.note ?? "No note"}
                  </span>
                  <span className="shrink-0 font-medium text-primary">
                    {checkIn.completedHabitIds.length} / {activeHabitCount}
                  </span>
                </div>
                {change != null ? (
                  <div
                    className={cn(
                      "mt-2 text-sm font-medium",
                      change <= 0 ? "text-primary" : "text-chart-3"
                    )}
                  >
                    {change <= 0 ? "-" : "+"} {Math.abs(change).toFixed(1)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Weight (kg)</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Habits</TableHead>
                <TableHead>Mood</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((checkIn) => {
                const change = getPreviousWeightChange(checkIn, checkIns);
                const MoodIcon = moodIcon[checkIn.mood];

                return (
                  <TableRow key={checkIn.id}>
                    <TableCell className="font-medium">
                      {formatDisplayDate(checkIn.date)}
                    </TableCell>
                    <TableCell>{checkIn.weight.toFixed(1)}</TableCell>
                    <TableCell>
                      {change == null ? (
                        <span className="text-muted-foreground">--</span>
                      ) : (
                        <span
                          className={cn(
                            "font-medium",
                            change <= 0 ? "text-primary" : "text-chart-3"
                          )}
                        >
                          {change <= 0 ? "-" : "+"} {Math.abs(change).toFixed(1)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="min-w-64 text-muted-foreground">
                      {checkIn.note ?? "No note"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-primary">
                        {checkIn.completedHabitIds.length} / {activeHabitCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MoodIcon className="text-primary size-4" />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="size-4" />
                        <span className="sr-only">Check-in actions</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex justify-center">
          <Button asChild variant="link">
            <Link href="/check-ins">View all check-ins</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
