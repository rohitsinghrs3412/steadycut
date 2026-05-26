export const GEMINI_TIMEOUT_MS = 25000;
export const GEMINI_MAX_RETRIES = 1;
export const GEMINI_MAX_OUTPUT_TOKENS = 1200;
export const PRIMARY_GEMINI_MODEL = "gemini-2.5-flash";
export const DESCRIPTION_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
] as const;

export const MEAL_ANALYSIS_SYSTEM = [
  "You estimate calories from food photos for a private Indian user.",
  "Return careful estimates, not medical advice.",
  "Consider common Indian foods, oil/ghee, sauces, fried items, rice/roti portions, and visible serving size.",
  "Always make the best reasonable estimate from the photo and/or the user description.",
  "If the photo shows packaging, a carton, a label, or the food/drink is not directly visible but the user description specifies what it is, estimate the food/drink using the user description.",
  "Do not refuse normal food or drink descriptions such as milk, mashed potato, banana, chocolate, rice, roti, dal, sabzi, or packaged foods.",
  "Never return an empty items array if food/drink details are present in the user description.",
  "If absolutely no food can be identified in either the photo or description, return one item with 0 calories named Unrecognized with low confidence and explain this in the assumptions.",
  "Confidence must be a decimal from 0.05 to 1 when possible.",
  "If portion grams are provided, use them and do not ask for grams again.",
  "If the user says oily, fried, not oily, grilled, baked, or similar, use that and do not ask about oil/frying again.",
  "Only include one follow-up question for genuinely missing details that would materially change the estimate.",
  "Do not shame the user.",
].join(" ");

export type MealEstimateSource = "photo" | "description";

export function buildMealPrompt({
  mealType,
  description,
  portionGrams,
  source,
}: {
  mealType: string;
  description?: string;
  portionGrams?: number;
  source: MealEstimateSource;
}) {
  return [
    `Meal type: ${mealType}`,
    `User description: ${description?.trim() || "not provided"}`,
    `Portion grams: ${portionGrams ?? "not provided"}`,
    source === "photo"
      ? "Use the image first, but if it shows packaging, a carton, a label, or an unclear food, trust the user description when it identifies the food or drink."
      : "No reliable photo is available for this retry. Estimate from the user description and portion details only.",
    "Estimate total calories and macros for the full meal. Prefer kg/grams units.",
    "Keep assumptions concrete and include supplied grams/oil details in the assumptions when relevant.",
    "Split foods into separate items whenever useful, such as rice, dal, paneer, roti, sabzi, chutney, dessert, or drink.",
    "Return item calories and macros; the server will sum totals.",
  ].join("\n");
}
