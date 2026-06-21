export type KnownFoodEstimate = {
  patterns: readonly RegExp[];
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultPortionGrams?: number;
};

export const KNOWN_FOOD_ESTIMATES: readonly KnownFoodEstimate[] = [
  {
    patterns: [/\bchicken\s+biryani\b/i],
    name: "Chicken biryani",
    caloriesPer100g: 170,
    proteinPer100g: 8,
    carbsPer100g: 22,
    fatPer100g: 5.5,
    defaultPortionGrams: 350,
  },
  {
    patterns: [/\bbiryani\b/i],
    name: "Biryani",
    caloriesPer100g: 165,
    proteinPer100g: 6,
    carbsPer100g: 24,
    fatPer100g: 5,
    defaultPortionGrams: 350,
  },
  {
    patterns: [/\bmashed\s+potato(?:es)?\b/i, /\bpotato\s+mash\b/i],
    name: "Mashed potato",
    caloriesPer100g: 90,
    proteinPer100g: 2,
    carbsPer100g: 15,
    fatPer100g: 3,
    defaultPortionGrams: 150,
  },
  {
    patterns: [/\bmilk\b/i],
    name: "Milk",
    caloriesPer100g: 62,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.3,
    defaultPortionGrams: 250,
  },
  {
    patterns: [/\bbanana\b/i],
    name: "Banana",
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
    defaultPortionGrams: 110,
  },
  {
    patterns: [/\bchocolate\b/i],
    name: "Chocolate",
    caloriesPer100g: 560,
    proteinPer100g: 7,
    carbsPer100g: 46,
    fatPer100g: 38,
    defaultPortionGrams: 40,
  },
  {
    patterns: [/\bcooked\s+rice\b/i, /\bwhite\s+rice\b/i, /\brice\b/i],
    name: "Cooked rice",
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    defaultPortionGrams: 150,
  },
  {
    patterns: [/\broti\b/i, /\bchapati\b/i],
    name: "Roti",
    caloriesPer100g: 260,
    proteinPer100g: 8,
    carbsPer100g: 46,
    fatPer100g: 5,
    defaultPortionGrams: 40,
  },
  {
    patterns: [/\bdal\b/i, /\bdaal\b/i, /\blentil\b/i],
    name: "Dal",
    caloriesPer100g: 115,
    proteinPer100g: 7,
    carbsPer100g: 18,
    fatPer100g: 3,
    defaultPortionGrams: 150,
  },
  {
    patterns: [/\bpaneer\b/i],
    name: "Paneer",
    caloriesPer100g: 265,
    proteinPer100g: 18,
    carbsPer100g: 3,
    fatPer100g: 20,
    defaultPortionGrams: 100,
  },
];
