# Handoff Report: AI Flows, PWA & Push Notifications Exploration

## 1. Observation

During my investigation of the workspace, I analyzed the following key files:

### A. AI Flows
- **`convex/ai/knownFoodEstimates.ts`**: Contains static food templates and regex patterns for local fallback.
  - Line 11: `export const KNOWN_FOOD_ESTIMATES: readonly KnownFoodEstimate[] = [...]`
- **`convex/ai/mealPrompt.ts`**: Configures Gemini timeout, retry limits, and system instructions for meal analysis.
  - Line 1: `export const GEMINI_TIMEOUT_MS = 25000;`
  - Line 2: `export const GEMINI_MAX_RETRIES = 1;`
  - Line 4: `export const PRIMARY_GEMINI_MODEL = "gemini-2.5-flash";`
  - Line 5: `export const DESCRIPTION_FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-flash-lite-latest"] as const;`
  - Line 11: `export const MEAL_ANALYSIS_SYSTEM = [...]`
  - Line 29: `export function buildMealPrompt(...)`
- **`convex/mealAnalysis.ts`**: Implements the main `analyzeMealPhoto` action.
  - Line 102: `export const analyzeMealPhoto = action({ ... })`
  - Line 181: `const knownFoodFallback = estimateMealFromKnownFoodDescription({ ... })`
  - Line 197: `try { return await generateMealEstimate({ ... source: "photo" }) }`
  - Line 206: `catch (caught) { const descriptionFallback = await tryEstimateMealFromDescription(caught, { ... }) ... }`
- **`convex/hydrationAnalysis.ts`**: Implements the `analyzeHydrationPhoto` action.
  - Line 38: `export const analyzeHydrationPhoto = action({ ... })`
  - Line 93: `const { output } = await generateText({ model: google("gemini-2.5-flash"), ... })`
- **`convex/scaleAnalysis.ts`**: Implements the `analyzeScalePhoto` action.
  - Line 23: `export const analyzeScalePhoto = action({ ... })`
  - Line 72: `if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) { return { weightKg: null, confidence: 0, needsManualReview: true, note: "The Gemini API key is missing, so the scale reading was not analyzed." }; }`
- **`convex/coach.ts`**: Implements the daily coaching logic.
  - Line 52: `export const generateDailyCoach = action({ ... })`
  - Line 109: System instructions: `"You are a kind but direct weight-loss consistency coach..."`

### B. PWA Setup
- **`src/app/manifest.ts`**: Generates the app's manifest config.
  - Line 3: `export default function manifest(): MetadataRoute.Manifest { ... }`
- **`public/sw.js`**: Custom service worker with routing strategies.
  - Line 1: `const CACHE_NAME = "steadycut-shell-v6";`
  - Line 4: `const PRIVATE_NAVIGATION_PREFIXES = [ "/dashboard", "/check-ins", ... ];`
  - Line 15: `const APP_SHELL_URLS = [ "/", "/offline", ... ];`
  - Line 60: `if (request.mode === "navigate") { event.respondWith(isPrivateNavigation(url.pathname) ? networkOnly(request, "/offline") : networkFirst(request, "/offline")); }`
- **`src/components/app/pwa-registrar.tsx`**: Client-side worker registration component.
  - Line 15: `void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });`
- **`src/components/app/root-providers.tsx`**: Renders `PwaRegistrar`.
  - Line 57: `<PwaRegistrar />`

### C. Push Notifications
- **`convex/schema.ts`**: Defines table `pushSubscriptions`.
  - Line 169: `pushSubscriptions: defineTable({ userId: v.string(), endpoint: v.string(), p256dh: v.string(), auth: v.string(), reminderHourLocal: v.number(), timezone: v.string(), ... })`
- **`convex/pushNotifications.ts`**: Handles DB queries and mutations for subscriptions.
  - Line 24: `export const upsertSubscription = mutation({ ... })`
- **`convex/pushActions.ts`**: Performs Web Push dispatch using VAPID details.
  - Line 44: `export const sendDueReminders = internalAction({ ... })`
  - Line 89: `async function sendPush(...)`
- **`src/components/steadycut/sections/settings.tsx`**: Front-end controls for push notifications.
  - Line 161: `function DailyReminderPanel({ vapidPublicKey }: { vapidPublicKey: string }) { ... }`
  - Line 202: `const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js", ...))`
  - Line 208: `const pushSubscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })`

---

## 2. Logic Chain

From the observations, the system's integration operates as follows:

1. **AI Flows & Resiliency**:
   - **Meal Analysis**: When a meal photo is uploaded, `analyzeMealPhoto` in `convex/mealAnalysis.ts` starts by checking if a local known food estimate matches the user description using `estimateMealFromKnownFoodDescription`. If it matches (e.g. "roti" or "biryani" in `KNOWN_FOOD_ESTIMATES`), it estimates calories and macros locally. This avoids calling the LLM entirely, saving latency and cost.
   - **Gemini Fallback Strategy**: If local matching fails, it invokes Gemini (`gemini-2.5-flash`). If the photo-based call fails, the catch block calls `tryEstimateMealFromDescription` which retries with a series of fallback models (`gemini-2.5-flash-lite`, `gemini-2.0-flash`, `gemini-flash-lite-latest`) relying on description only.
   - **Coaching & Scale Fallbacks**: If the Gemini API key is missing, `generateDailyCoach` and `readScale` automatically fall back to providing structured, static mock coaching insights or flags indicating that manual review is required.

2. **PWA Shell Caching & Security**:
   - Next.js exposes `/manifest.webmanifest` by calling `src/app/manifest.ts`.
   - The service worker (`sw.js`) pre-caches the static shell components on install.
   - To prevent displaying outdated dashboard or user profiles when offline, any navigation request (`mode === "navigate"`) pointing to `/dashboard` or other private routes is served using a **network-only** strategy. If the user is offline, it serves the cached `/offline` page. Public pages use a **network-first** strategy. Static assets use **stale-while-revalidate**.

3. **Push Notifications Lifecycle**:
   - **Activation**: In `settings.tsx`, the client requests browser notification permissions, registers the `/sw.js` service worker, and requests a push subscription from the browser's `PushManager` using the VAPID public key. It then calls the `upsertSubscription` mutation to store the subscription keys, local reminder hour, and timezone in Convex.
   - **Cron Triggers**: Every 15 minutes, Convex Crons trigger `sendDueReminders` (`convex/pushActions.ts`). The function maps the UTC clock to the user's timezone, checking if `local.hour` matches the user's preferred local hour.
   - **Sending & Cleanup**: If due, it calls `sendPush`, which uses the NPM package `web-push` along with the VAPID keys to send the request. If the push request returns a `404` or `410` (unsubscribed/expired), the backend automatically deletes the subscription from the DB.
   - **SW Listener**: The service worker listens to `"push"` events, parses the JSON payload, displays the notification with a vibration pattern, and opens/focuses the target path upon `"notificationclick"`.

---

## 3. Caveats

- **Timezone Calculations**: The scheduling logic checks reminders in 15-minute intervals. If the user changes their timezone, there may be up to a 15-minute delay before they receive the reminder.
- **Service Worker Scope**: The service worker runs with scope `"/"`, meaning it has access to intercept all GET requests within the application root. Any cross-origin endpoints (such as Clerk or Convex APIs) are bypassed.

---

## 4. Conclusion

The SteadyCut AI and PWA configuration is highly robust, utilizing localized fallbacks (regular expression templates), multi-tiered LLM retries (falling back to lightweight text models), clean secure/private routing service worker rules, and a fully automated web push notification scheduler tied to Convex Crons and timezone tracking.

---

## 5. Verification Method

To verify the findings and check the health of the project, run:
- **Type Checking**: `npm run typecheck` to confirm typescript compilation.
- **Unit Tests**: `npm run test` (which triggers vitest on `src/lib/steadycut.test.ts`).
- **File Inspections**: Inspect `public/sw.js` and `convex/pushActions.ts` to verify the handling of route caching and VAPID settings respectively.
