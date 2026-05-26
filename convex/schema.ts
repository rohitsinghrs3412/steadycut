import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const moodValidator = v.union(
  v.literal("great"),
  v.literal("good"),
  v.literal("flat"),
  v.literal("hard")
);

export const habitIconValidator = v.union(
  v.literal("utensils"),
  v.literal("dumbbell"),
  v.literal("droplet"),
  v.literal("footprints")
);

export const habitColorValidator = v.union(
  v.literal("green"),
  v.literal("blue"),
  v.literal("amber"),
  v.literal("violet")
);

export const mealTypeValidator = v.union(
  v.literal("breakfast"),
  v.literal("lunch"),
  v.literal("dinner"),
  v.literal("snack")
);

export const mealItemValidator = v.object({
  name: v.string(),
  calories: v.number(),
  proteinGrams: v.optional(v.number()),
  carbsGrams: v.optional(v.number()),
  fatGrams: v.optional(v.number()),
  portionGrams: v.optional(v.number()),
});

export const scaleTimeOfDayValidator = v.union(
  v.literal("morning"),
  v.literal("night")
);

export const sexValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other")
);

export const ancestryValidator = v.union(
  v.literal("south-asian"),
  v.literal("east-asian"),
  v.literal("southeast-asian"),
  v.literal("middle-eastern"),
  v.literal("european"),
  v.literal("african"),
  v.literal("latin-american"),
  v.literal("mixed"),
  v.literal("other")
);

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    displayName: v.optional(v.string()),
    heightCm: v.optional(v.number()),
    sex: v.optional(sexValidator),
    ancestry: v.optional(ancestryValidator),
    targetCalories: v.optional(v.number()),
    targetWeightKg: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  habits: defineTable({
    userId: v.string(),
    name: v.string(),
    iconKey: habitIconValidator,
    color: habitColorValidator,
    targetCadence: v.union(v.literal("daily"), v.literal("weekly")),
    active: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "active"]),

  checkIns: defineTable({
    userId: v.string(),
    date: v.string(),
    weight: v.number(),
    note: v.optional(v.string()),
    mood: moodValidator,
    completedHabitIds: v.array(v.id("habits")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  coachMessages: defineTable({
    userId: v.string(),
    date: v.string(),
    promptSummary: v.string(),
    insight: v.string(),
    nextAction: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  mealLogs: defineTable({
    userId: v.string(),
    date: v.string(),
    mealType: mealTypeValidator,
    photoId: v.id("_storage"),
    status: v.optional(v.union(v.literal("estimating"), v.literal("ready"))),
    description: v.optional(v.string()),
    portionGrams: v.optional(v.number()),
    foodName: v.string(),
    items: v.optional(v.array(mealItemValidator)),
    calories: v.number(),
    proteinGrams: v.optional(v.number()),
    carbsGrams: v.optional(v.number()),
    fatGrams: v.optional(v.number()),
    confidence: v.number(),
    assumptions: v.array(v.string()),
    followUpQuestion: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"])
    .index("by_status", ["status"]),

  scaleLogs: defineTable({
    userId: v.string(),
    date: v.string(),
    timeOfDay: scaleTimeOfDayValidator,
    photoId: v.id("_storage"),
    weightKg: v.optional(v.number()),
    rawReading: v.optional(v.string()),
    confidence: v.number(),
    needsManualReview: v.boolean(),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  hydrationLogs: defineTable({
    userId: v.string(),
    date: v.string(),
    photoId: v.id("_storage"),
    beverageName: v.string(),
    containerName: v.string(),
    volumeMl: v.number(),
    confidence: v.number(),
    assumptions: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    reminderHourLocal: v.number(),
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSentDate: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_reminder", ["reminderHourLocal"]),
});
