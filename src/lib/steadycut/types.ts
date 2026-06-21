export type Mood = "great" | "good" | "flat" | "hard";

export type HabitIconKey = "utensils" | "dumbbell" | "droplet" | "footprints";

export type Habit = {
  id: string;
  name: string;
  iconKey: HabitIconKey;
  color: "green" | "blue" | "amber" | "violet";
  targetCadence: "daily" | "weekly";
  active: boolean;
  sortOrder: number;
};

export type CheckIn = {
  id: string;
  date: string;
  weight: number;
  note?: string;
  mood: Mood;
  completedHabitIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type CoachMessage = {
  id: string;
  date: string;
  promptSummary: string;
  insight: string;
  nextAction: string;
  createdAt: number;
};

export type Sex = "male" | "female" | "other";

export type Ancestry =
  | "south-asian"
  | "east-asian"
  | "southeast-asian"
  | "middle-eastern"
  | "european"
  | "african"
  | "latin-american"
  | "mixed"
  | "other";

export type UserProfile = {
  id?: string;
  displayName?: string;
  heightCm?: number;
  sex?: Sex;
  ancestry?: Ancestry;
  targetCalories?: number;
  targetWeightKg?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type ProfileInput = {
  displayName?: string;
  heightCm?: number;
  sex?: Sex;
  ancestry?: Ancestry;
  targetCalories?: number;
  targetWeightKg?: number;
};

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type MealItem = {
  name: string;
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  portionGrams?: number;
};

export type MealLog = {
  id: string;
  date: string;
  mealType: MealType;
  photoId: string;
  photoUrl?: string | null;
  status?: "estimating" | "ready";
  description?: string;
  portionGrams?: number;
  foodName: string;
  items: MealItem[];
  calories: number;
  proteinGrams?: number;
  carbsGrams?: number;
  fatGrams?: number;
  confidence: number;
  assumptions: string[];
  followUpQuestion?: string;
  createdAt: number;
  updatedAt: number;
};

export type ScaleTimeOfDay = "morning" | "night";

export type ScaleLog = {
  id: string;
  date: string;
  timeOfDay: ScaleTimeOfDay;
  photoId: string;
  photoUrl?: string | null;
  weightKg?: number;
  rawReading?: string;
  confidence: number;
  needsManualReview: boolean;
  note?: string;
  createdAt: number;
};

export type HydrationLog = {
  id: string;
  date: string;
  photoId?: string;
  photoUrl?: string | null;
  beverageName: string;
  containerName: string;
  volumeMl: number;
  confidence: number;
  assumptions: string[];
  createdAt: number;
  updatedAt: number;
};

export type DashboardData = {
  profile?: UserProfile | null;
  habits: Habit[];
  checkIns: CheckIn[];
  coachMessage?: CoachMessage | null;
  mealLogs?: MealLog[];
  scaleLogs?: ScaleLog[];
  hydrationLogs?: HydrationLog[];
};

export type CheckInInput = {
  date: string;
  weight: number;
  note?: string;
  mood: Mood;
  completedHabitIds: string[];
};
