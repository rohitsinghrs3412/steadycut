import {
  Dumbbell,
  Footprints,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

import type { Habit, HabitIconKey } from "@/lib/steadycut";

export const habitIcons: Record<HabitIconKey, LucideIcon> = {
  utensils: Utensils,
  dumbbell: Dumbbell,
  droplet: Waves,
  footprints: Footprints,
};

export const habitIconOptions: Array<{ value: HabitIconKey; label: string }> = [
  { value: "utensils", label: "Food" },
  { value: "dumbbell", label: "Strength" },
  { value: "droplet", label: "Hydration" },
  { value: "footprints", label: "Steps" },
];

export const habitColorOptions: Array<{
  value: Habit["color"];
  label: string;
}> = [
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "amber", label: "Amber" },
  { value: "violet", label: "Violet" },
];

export const habitColorClass: Record<Habit["color"], string> = {
  green: "bg-primary text-primary-foreground",
  blue: "bg-chart-1 text-white",
  amber: "bg-chart-3 text-foreground",
  violet: "bg-chart-5 text-white",
};
