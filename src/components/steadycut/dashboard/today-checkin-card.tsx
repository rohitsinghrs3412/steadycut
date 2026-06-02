"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckIn,
  CheckInInput,
  Habit,
  Mood,
  moodOptions,
  toDateKey,
} from "@/lib/steadycut";

const checkInSchema = z.object({
  date: z.string().min(1),
  weight: z.number().min(30).max(300),
  note: z.string().max(200).optional(),
  mood: z.enum(["great", "good", "flat", "hard"]),
  completedHabitIds: z.array(z.string()),
});

type CheckInFormValues = z.infer<typeof checkInSchema>;

export function TodayCheckInCard({
  activeHabits,
  latestWeight,
  onSaveCheckIn,
  todayCheckIn,
}: {
  activeHabits: Habit[];
  latestWeight: number;
  onSaveCheckIn: (input: CheckInInput) => Promise<void>;
  todayCheckIn: CheckIn | null;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const form = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: getCheckInDefaults(activeHabits, latestWeight, todayCheckIn),
  });
  const note = useWatch({ control: form.control, name: "note" }) ?? "";
  const mood = useWatch({ control: form.control, name: "mood" });

  useEffect(() => {
    form.reset(getCheckInDefaults(activeHabits, latestWeight, todayCheckIn));
  }, [activeHabits, form, latestWeight, todayCheckIn]);

  async function onSubmit(values: CheckInFormValues) {
    setStatus("saving");
    await onSaveCheckIn({
      ...values,
      note: values.note?.trim() || undefined,
    });
    setStatus("saved");
    window.setTimeout(() => setStatus("idle"), 1600);
  }

  return (
    <Card className="glass-card transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle>{"Today's check-in"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-1">
            <div className="flex flex-col gap-2 sm:col-span-2 xl:col-span-1">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                inputMode="decimal"
                step="0.1"
                type="number"
                {...form.register("weight", { valueAsNumber: true })}
              />
              {form.formState.errors.weight ? (
                <p className="text-xs text-destructive">
                  Enter a realistic weight in kg.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...form.register("date")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="mood">Mood</Label>
              <Select
                value={mood}
                onValueChange={(value: Mood) =>
                  form.setValue("mood", value, { shouldDirty: true })
                }
              >
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {moodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note">Note</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {note.length}/200
              </span>
            </div>
            <Textarea
              id="note"
              placeholder="How are you feeling? Anything to note?"
              rows={3}
              {...form.register("note")}
            />
          </div>

          <Button
            className="h-11 scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]"
            disabled={status === "saving"}
            type="submit"
          >
            {status === "saving" ? "Saving..." : "Log check-in"}
          </Button>
          {status === "saved" ? (
            <p className="text-center text-sm font-medium text-primary">
              Check-in saved.
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function getCheckInDefaults(
  activeHabits: Habit[],
  latestWeight: number,
  todayCheckIn: CheckIn | null
): CheckInFormValues {
  return {
    date: todayCheckIn?.date ?? toDateKey(),
    weight: todayCheckIn?.weight ?? latestWeight,
    note: todayCheckIn?.note ?? "",
    mood: todayCheckIn?.mood ?? "good",
    completedHabitIds:
      todayCheckIn?.completedHabitIds ?? activeHabits.map((habit) => habit.id),
  };
}
