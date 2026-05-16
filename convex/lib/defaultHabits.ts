import type { Doc } from "../_generated/dataModel";

export const defaultHabits: Array<
  Pick<
    Doc<"habits">,
    "name" | "iconKey" | "color" | "targetCadence" | "active" | "sortOrder"
  >
> = [
  {
    name: "Stay within calorie target",
    iconKey: "utensils",
    color: "green",
    targetCadence: "daily",
    active: true,
    sortOrder: 0,
  },
  {
    name: "Strength training",
    iconKey: "dumbbell",
    color: "blue",
    targetCadence: "weekly",
    active: true,
    sortOrder: 1,
  },
  {
    name: "2L+ water",
    iconKey: "droplet",
    color: "amber",
    targetCadence: "daily",
    active: true,
    sortOrder: 2,
  },
  {
    name: "8k+ steps",
    iconKey: "footprints",
    color: "violet",
    targetCadence: "daily",
    active: true,
    sortOrder: 3,
  },
];
