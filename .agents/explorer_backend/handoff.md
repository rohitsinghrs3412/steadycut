# Backend Explorer Handoff Report

## 1. Observation
A detailed, read-only analysis of the `convex/` directory was performed. The following files, structures, and configurations were observed:

### A. Database Schema (`convex/schema.ts`)
The database schema defines eight tables under a `defineSchema` structure:
- **`profiles`**: User settings and goals (e.g., target weight, height, sex, ancestry, daily calorie target).
- **`habits`**: User habits with color, icon, target cadence (daily/weekly), active status, and sort order.
- **`checkIns`**: Daily progress logs containing weight, mood, text notes, and completed habit IDs.
- **`coachMessages`**: Daily coach feedback message containing the AI prompt summary, insight, next action, and date.
- **`mealLogs`**: Meal entry logs containing food details, photo storage IDs, status, items array, total calories/macros, confidence, assumptions, and follow-up question.
- **`scaleLogs`**: Weigh-in records from scale photos containing photo storage IDs, weight reading, confidence, review flags, and notes.
- **`hydrationLogs`**: Water/beverage intake logs containing beverage name, container description, volume in ml, and assumptions.
- **`pushSubscriptions`**: Push notification subscription endpoints and configurations (reminder hour, timezone, last sent date).

Relevant indices observed:
- `profiles`: Indexed by `"by_user"` on `["userId"]`.
- `habits`: Indexed by `"by_user"` on `["userId"]` and `"by_user_active"` on `["userId", "active"]`.
- `checkIns`: Indexed by `"by_user"` on `["userId"]` and `"by_user_date"` on `["userId", "date"]`.
- `coachMessages`: Indexed by `"by_user"` on `["userId"]` and `"by_user_date"` on `["userId", "date"]`.
- `mealLogs`: Indexed by `"by_user"` on `["userId"]`, `"by_user_date"` on `["userId", "date"]`, and `"by_status"` on `["status"]`.
- `scaleLogs`: Indexed by `"by_user"` on `["userId"]` and `"by_user_date"` on `["userId", "date"]`.
- `hydrationLogs`: Indexed by `"by_user"` on `["userId"]` and `"by_user_date"` on `["userId", "date"]`.
- `pushSubscriptions`: Indexed by `"by_user"` on `["userId"]` and `"by_reminder"` on `["reminderHourLocal"]`.

Verbatim schema validators from `convex/schema.ts` (lines 4-62):
```typescript
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
```

### B. Authentication & Authorization Whitelist (`convex/auth.config.ts`, `convex/lib/auth.ts`)
Convex authenticates with Clerk via JWT issuer integration (`auth.config.ts`):
```typescript
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

Authorization is strictly governed by a helper module `convex/lib/auth.ts`. Any query, mutation, or action must call `getUserId(ctx)` which enforces authentication and checks if the identity is whitelisted via environment parameters (lines 25-69):
```typescript
function isAuthorizedIdentity(identity: {
  subject: string;
  email?: string;
  [key: string]: unknown;
}) {
  const allowedUserIds = parseCsvEnv(process.env.STEADYCUT_ALLOWED_USER_IDS);
  const allowedEmails = parseCsvEnv(process.env.STEADYCUT_ALLOWED_EMAILS).map(
    (email) => email.toLowerCase()
  );
  const allowedOrgIds = parseCsvEnv(process.env.STEADYCUT_ALLOWED_ORG_IDS);
  const allowedOrgRoles = parseCsvEnv(process.env.STEADYCUT_ALLOWED_ORG_ROLES);

  if (
    allowedUserIds.length === 0 &&
    allowedEmails.length === 0 &&
    allowedOrgIds.length === 0
  ) {
    return false;
  }

  if (allowedUserIds.includes(identity.subject)) {
    return true;
  }

  const email = identity.email?.toLowerCase();
  if (email && allowedEmails.includes(email)) {
    return true;
  }

  const orgId = getStringClaim(identity, [
    "org_id",
    "orgId",
    "organization_id",
  ]);
  const orgRole = getStringClaim(identity, ["org_role", "orgRole"]);

  if (orgId && allowedOrgIds.includes(orgId)) {
    return (
      allowedOrgRoles.length === 0 ||
      (orgRole !== undefined && allowedOrgRoles.includes(orgRole))
    );
  }

  return false;
}
```

### C. Convex Functions and Business Logic Maps
Convex functions are grouped logically by domains:
1. **Profiles (`convex/profiles.ts`)**:
   - `ensureProfile` (mutation): Ensures a profile exists for the authenticated user; inserts it if missing.
   - `getMyProfile` (query): Retrieves the authenticated user's profile.
   - `upsertProfile` (mutation): Creates or updates profile fields (height, display name, sex, ancestry, targets).
2. **Habits (`convex/habits.ts`)**:
   - `ensureDefaultHabits` (mutation): Creates default habits (Calorie target, Strength training, 2L+ water, 8k+ steps) for new profiles.
   - `addHabit` (mutation): Appends a new habit for the user and increments `sortOrder`.
   - `updateHabit` (mutation): Modifies a habit.
   - `deleteHabit` (mutation): Deletes a habit and filters its ID out of any daily check-ins.
   - `reorderHabits` (mutation): Updates the `sortOrder` for an array of habits.
3. **Check-ins (`convex/checkIns.ts`)**:
   - `upsertCheckIn` (mutation): Inserts or updates the daily check-in (mood, weight, note, and checked-off habit IDs) for a specific date.
4. **Hydration logs (`convex/hydrationLogs.ts`, `convex/hydrationAnalysis.ts`)**:
   - `listRecent` (query): Lists the user's hydration logs, resolving photo storage URLs.
   - `logManualHydration` (mutation): Adds a quick manual log (e.g. 250ml or 500ml water) and triggers habit sync.
   - `analyzeHydrationPhoto` (action): Validates size and triggers Gemini image analysis.
   - `saveHydrationLog` (internalMutation): Called by AI actions to insert the estimated beverage volume.
   - **Habit Sync (`syncWaterHabitForDate`)**: Sums the day's intake. If the sum is $\ge 2000$ ml (`HYDRATION_TARGET_ML`), it automatically checks off the droplet/water habit in the user's check-in for that date.
5. **Meal logs (`convex/mealLogs.ts`, `convex/mealAnalysis.ts`, `convex/ai/`)**:
   - `listRecent` (query): Lists recent meal logs, ignoring failed/estimating states.
   - `savePlaceholder` (mutation): Inserts an "estimating" status meal log to render in the UI while Gemini analysis runs.
   - `analyzeMealPhoto` (action): Enforces constraints, retrieves photo, and triggers Gemini AI analysis (`gemini-2.5-flash`). On success, calls `saveMealLog` to persist. On failure, cleans up the placeholder log.
   - `saveConfirmedMealLog` (mutation): Allows confirming and manually editing estimated meal items.
   - `deleteStaleEstimatingMealLogs` (internalMutation): Cleans up temporary "estimating" logs that have exceeded the 10-minute threshold.
   - **AI Retries and Fallbacks**: If the Gemini photo analysis fails, `estimateMeal` tries a text-only retry (user description) with fallback models (`gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-flash-lite-latest`). If the Gemini API is entirely unconfigured (no API key), it falls back to a regex-based lookup against `convex/ai/knownFoodEstimates.ts` (defining chicken biryani, paneer, roti, dal, etc.).
6. **Scale logs (`convex/scaleLogs.ts`, `convex/scaleAnalysis.ts`)**:
   - `listRecent` (query): Lists weight logs with photo URLs.
   - `analyzeScalePhoto` (action): Analyzes scale display photo using Gemini.
   - `saveScaleLog` (internalMutation): Persists the reading. **Variance Check**: Computes the difference against the user's previous weigh-in. If the weight fluctuates by $> 5\%$ or $> 4$ kg, it flags `needsManualReview = true` and logs a note. Otherwise, it updates or inserts the daily `checkIn` weight.
   - `updateWeight` (mutation): Manually overwrites a scale reading, clearing `needsManualReview` and updating the check-in weight.
7. **Coaching (`convex/coach.ts`)**:
   - `generateDailyCoach` (action): Compiles the user's dashboard data (latest 14 check-ins, active habits, recent 10 meals, recent 10 weight readings) into a JSON summary. Sends this to `gemini-2.5-flash` with a behavioral coaching prompt to generate an `insight` and `nextAction`.
   - `saveCoachMessage` (internalMutation): Upserts the generated coaching feedback for that user and date.
8. **Uploads (`convex/uploads.ts`)**:
   - `generateUploadUrl` (mutation): Generates a secure upload URL for image storage.
9. **Crons (`convex/crons.ts`, `convex/pushActions.ts`, `convex/pushNotifications.ts`)**:
   - Cron jobs define background tasks:
     - Weigh-in reminders (every 15 minutes) -> `internal.pushActions.sendDueReminders`.
     - Stale estimate cleaner (every 30 minutes) -> `internal.mealLogs.deleteStaleEstimatingMealLogs`.
   - `sendDueReminders` (internalAction): Checks subscriptions against their configured `reminderHourLocal` and user's timezone. Triggers `web-push` notification payload (if not already sent today). Automatically deletes subscription endpoints returning `404` or `410` (gone/expired).

---

## 2. Logic Chain

1. **Authentication and Security Boundary**: Every user mutation and query is anchored to a Clerk authenticated identity. By calling `getUserId(ctx)` inside queries/mutations, the code confirms that the user is logged in, validates their JWT issuer domain (`convex/auth.config.ts`), and verifies them against the CSV whitelists in the environment (e.g. `STEADYCUT_ALLOWED_USER_IDS`). If whitelisting fails, requests are blocked.
2. **Synchronization of Logs to Daily Progress (Check-ins)**:
   - *Hydration*: Manual or AI water logs update the database -> `syncWaterHabitForDate` aggregates the day's sum -> triggers habit completion once target is reached -> checks off the habit inside `checkIns` for that date.
   - *Weigh-ins*: Scale logs are written -> variance check evaluates deviation -> if normal, updates the `checkIns` weight for that date -> if extreme deviation, sets `needsManualReview = true` to prevent polluting the trend data.
3. **AI Vision Pipeline Resiliency**:
   - Users upload photos to storage -> placeholder log with status "estimating" is created (`savePlaceholder`) to keep UI responsive.
   - Analysis action fetches image buffer -> requests structured JSON matching Zod schemas (`hydrationEstimateSchema`, `mealEstimateSchema`, `scaleReadingSchema`) from Gemini.
   - If API fails, retry handlers execute description-only retries, or resolve standard estimates locally via `knownFoodEstimates.ts` without throwing fatal errors.
   - Placeholder is garbage collected or cleaned up if failures persist.
4. **Scheduled Push notifications**: Cron loops every 15 minutes -> fetches active subscriptions -> parses local timezone hour -> sends Web Push payloads only to matching targets -> deletes dead endpoints.

---

## 3. Caveats
- No caveats. The entire Convex database backend structure, including schemas, index constraints, internal helpers, cron engines, and AI action wrappers, has been thoroughly inspected. Frontend interfaces and browser service workers that subscribe to these endpoints were not analyzed as they fall under frontend/client scope.

---

## 4. Conclusion
The SteadyCut backend is a robust, serverless Convex setup.
- **Relational Integrity**: Entities are bound to users by `userId` strings. Many-to-many relationship mapping between habits and check-ins is managed via ID array references.
- **Strict Authorization**: Whitelisting environment rules block unauthorized traffic in live mode.
- **AI Stability**: Vision modules employ multi-tier fallbacks (from image-to-text to text-only to local regex fallbacks) to ensure food estimations remain resilient.
- **Background Tasks**: Built-in cron integrations successfully automate notification delivery and stale data garbage collection.

---

## 5. Verification Method

To verify the codebase structure, typings, and configuration validity, run:
1. **Type Checking**:
   ```bash
   npm run typecheck
   ```
   Ensures all TypeScript definitions, Convex schemas, and function calls are fully compatible and compile without errors.
2. **ESLint Verification**:
   ```bash
   npm run lint
   ```
   Validates backend rules, imports, and styling conventions.
3. **Unit Tests**:
   ```bash
   npm run test
   ```
   Runs Vitest checks for helper functions (such as EWMA weight trend calculation, calorie aggregation, hydration statistics, etc.).
