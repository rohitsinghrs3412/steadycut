import { Habit, Mood, MealType, Sex, Ancestry, ScaleTimeOfDay } from "./types";

export const MAX_REASONABLE_MEAL_PORTION_GRAMS = 5000;
export const HYDRATION_TARGET_ML = 2000;

export const NON_FOOD_DESCRIPTION_PATTERN =
  /\b(human|human being|person|people|man|woman|boy|girl|child|face|selfie|body)\b/i;

export const DEFAULT_HABITS = [
  {
    id: "calorie-target",
    name: "Stay within calorie target",
    iconKey: "utensils",
    color: "green",
    targetCadence: "daily",
    active: true,
    sortOrder: 0,
  },
  {
    id: "strength-training",
    name: "Strength training",
    iconKey: "dumbbell",
    color: "blue",
    targetCadence: "weekly",
    active: true,
    sortOrder: 1,
  },
  {
    id: "water",
    name: "2L+ water",
    iconKey: "droplet",
    color: "amber",
    targetCadence: "daily",
    active: true,
    sortOrder: 2,
  },
  {
    id: "steps",
    name: "8k+ steps",
    iconKey: "footprints",
    color: "violet",
    targetCadence: "daily",
    active: true,
    sortOrder: 3,
  },
] satisfies Habit[];

export const moodOptions: { value: Mood; label: string }[] = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "flat", label: "Flat" },
  { value: "hard", label: "Hard" },
];

export const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export const sexOptions: { value: Sex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const ancestryOptions: { value: Ancestry; label: string }[] = [
  { value: "south-asian", label: "South Asian" },
  { value: "east-asian", label: "East Asian" },
  { value: "southeast-asian", label: "Southeast Asian" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "european", label: "European" },
  { value: "african", label: "African" },
  { value: "latin-american", label: "Latin American" },
  { value: "mixed", label: "Mixed" },
  { value: "other", label: "Other" },
];

export const scaleTimeOptions: { value: ScaleTimeOfDay; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "night", label: "Night" },
];
