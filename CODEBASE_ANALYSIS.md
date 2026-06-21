# SteadyCut Codebase Analysis Report

This report provides an in-depth architectural and code quality analysis of the SteadyCut codebase. SteadyCut is a private weight-loss consistency application built using a Next.js App Router frontend, a Convex backend, Clerk authentication, Gemini-powered AI, PWA caching, and web push notifications.

---

## 1. Architecture Overview

SteadyCut is structured as a modern, serverless Next.js App Router application optimized for mobile viewports and rich real-time interaction.

### System Architecture Diagram
```
              +----------------------------------+
              |          Next.js Client          |
              |   (React 19 / Tailwind CSS v4)   |
              +-----------------+----------------+
                                |
             +------------------+------------------+
             |                                     |
             v                                     v
+------------+-------------+         +-------------+-------------+
|    Clerk Authentication  |         |       Convex Backend      |
|  (User Identity / JWT)   |         | (Schema, Queries, Mut's)  |
+------------+-------------+         +-------------+-------------+
             |                                     |
             |                                     v
             |                        +------------+-------------+
             |                        |     Gemini AI Actions    |
             |                        |  (Meal / Scale / Coach)  |
             +-----------------+------+--------------------------+
                               |
                               v
                     +---------+---------+
                     |   Push Reminders  |
                     |  (VAPID / Crons)  |
                     +-------------------+
```

### Core Design Decisions
1. **Dual Product Mode (Demo/Live)**:
   The application determines its operation mode based on the presence of server configuration keys (such as Clerk publishable keys and Convex URLs). Sourced via `getAppRouteContext()` in `src/lib/app-route.ts`:
   - **Demo Mode**: Used when live environment parameters are missing. It renders fully functional user screens using mock/fixture data generated from `src/lib/steadycut.ts`.
   - **Live Mode**: Standard production mode. It uses Clerk for credentials and hooks directly into live Convex functions via types generated under `convex/_generated/`.

2. **Preventing Layout Shifts (CLS) and Latency Mitigation**:
   - **`useSyncExternalStore` Memory Cache**: In `src/components/steadycut/dashboard-query-provider.tsx`, queries are cached in-memory at a module level. When navigating between screens, the cached dashboard data renders immediately, avoiding the flashing "skeleton loader" pattern. Live database queries update this store, notifying listeners and refreshing the UI seamlessly.
   - **Chart Space Allocations**: Responsive components like `ProgressChart` define explicit default dimensions (`initialDimension={{ height: 240, width: 400 }}`) to reserve layout space during hydration.

3. **Styling Pipeline**:
   - **Tailwind CSS v4 Integration**: The project uses the brand new Tailwind v4. It does not contain a `tailwind.config.js`, managing style configurations instead through CSS directives and `@theme` inline blocks inside `src/app/globals.css`.
   - **OKLCH Color Spaces**: Colors (such as the light brand bg `oklch(0.993 0.002 145)` and dark brand bg `oklch(0.135 0.004 260)`) are defined in OKLCH, enabling uniform perceptual lightness control.

---

## 2. Module Walkthroughs

### A. Frontend Architecture (`src/app/` and `src/components/`)
- **Next.js App Router Structure**:
  - `src/app/layout.tsx`: Configures typography (using `next/font/google` with Geist Sans and Geist Mono), viewport settings, metadata, and wraps the tree in `RootProviders` (integrating Clerk and Convex).
  - `src/app/template.tsx`: Renders smooth route transitions (`animate-page-fade`) using a pathname key wrapper.
  - `src/app/page.tsx`: Landing entry routing that checks for session state and redirects active users to `/dashboard` or renders the public entry screen.
- **Client/Server Component Boundaries**:
  Pages act as Server Component entry points. They load session contexts and environment states on the server before importing and rendering interactive Client Components (marked with `"use client"`). Out of 124 frontend source files, 43 declare `"use client"` to handle interactive controls like forms, modal sheets, and charts.
- **Mobile-first Enhancements**:
  - `MobileBottomNav` handles navigation on mobile screens. It uses CSS safe area padding (`pb-[max(0.75rem,env(safe-area-inset-bottom))]`) to support bottom system indicators on modern bezel-less screens.
  - Sibling components like `MobileAppChrome` are loaded using Next.js dynamic imports (`ssr: false`) to prevent SSR/CSR hydration mismatches with browser-only APIs.

### B. Convex Backend (`convex/`)
- **Convex Schema (`convex/schema.ts`)**:
  Defines 8 strongly typed tables:
  - `profiles`: Target weights, height, sex, ancestry, and calorie goals.
  - `habits`: Consistency habits (Calorie target, steps, training, hydration) with custom colors, icons, and display order.
  - `checkIns`: Daily records of weights, mood, text notes, and checked habit IDs.
  - `coachMessages`: Daily AI coach messages.
  - `mealLogs` / `scaleLogs` / `hydrationLogs`: Individual tracking entries.
  - `pushSubscriptions`: Subscriptions for reminders.
- **Authentication & Whitelist Authorization (`convex/lib/auth.ts`)**:
  JWT verification is handled by Clerk via `convex/auth.config.ts`. Authorization checks in all queries and mutations go through `getUserId(ctx)`. This checks the user's ID/email against the whitelists in the environment (`STEADYCUT_ALLOWED_USER_IDS`, `STEADYCUT_ALLOWED_EMAILS`), blocking unauthorized access.

### C. AI Flows
- **Meal Analysis Vision Pipeline (`convex/mealAnalysis.ts`)**:
  Analyzes food photos using Gemini. A placeholder is immediately saved as "estimating" to keep the UI responsive. The backend requests structured JSON outputs from `gemini-2.5-flash` matching Zod schemas. If the image analysis fails, it retries using the user's text description with fallback models (`gemini-2.5-flash-lite`, `gemini-2.0-flash`, etc.).
- **Local Fallback Engine (`convex/ai/knownFoodEstimates.ts`)**:
  If the Gemini API key is missing or calls fail completely, it runs a localized regex lookup on the user's description (e.g. matching Dal, Roti, Chicken Biryani) to provide calorie/macro estimates instantly without LLM latency or cost.
- **Coaching Feedback Action (`convex/coach.ts`)**:
  Collects recent data (14 check-ins, 10 meals, weight trends) and calls `gemini-2.5-flash` to generate daily, personalized, and behavioral consistency recommendations.

### D. PWA and Push Notifications
- **Service Worker Lifecycle (`public/sw.js`)**:
  Pre-caches core app shell assets. To maintain security, private routes under `/dashboard`, `/check-ins`, and `/progress` are matched to a strict `networkOnly` strategy (with offline redirect to `/offline`), preventing unauthorized offline displays. Public routes use `networkFirst`, and static assets use `staleWhileRevalidate`.
- **Scheduled Web Push Notifications**:
  A Convex Cron job (`convex/crons.ts`) triggers every 15 minutes to run `sendDueReminders` (`convex/pushActions.ts`). The system converts UTC time to the user's local timezone, checks if it is within their preferred hour, and uses the `web-push` NPM library with VAPID keys to dispatch notifications. Dead endpoints (404/410 errors) are automatically purged from the DB.

---

## 3. Refactoring and Code Quality Audit

A comprehensive file audit was performed to scan for files that exceed the guidelines specified in `ARCHITECTURE.md`. Sibling reviewer analysis verified physical line counts (including carriage returns and blank lines).

### Exceeded Codebase File Guidelines

| File Path | Component Category | Physical Line Count | Guideline Limit | Architectural Impact & bloat cause |
|---|:---:|:---:|:---:|---|
| `src/components/steadycut/photo-logging-workspace.tsx` | Feature TSX | **1485** | 400 | **Critical Violator (>800 lines)**. Contains inline interfaces, camera controllers, meal editing, scale log confirmation sheets, and hydration bubbles in one file. |
| `src/components/steadycut/live-coach-screen.tsx` | Feature TSX | **1455** | 400 | **Critical Violator (>800 lines)**. Implements local Gemini audio-visual sessions, WebRTC/WebSockets, UI layouts, mic permissions, and audio streams in a single file. |
| `src/components/steadycut/dashboard-screen.tsx` | Feature TSX | **1295** | 400 | **Critical Violator (>800 lines)**. Contains multiple sub-components (such as `ConsistencyCard`, `HabitsCard`, `WeightTrendCard`) that should be separate widgets. |
| `src/lib/steadycut.ts` | Domain Module | **761** | 300 | Houses all demo fixtures, statistics calculators, calorie metrics, and type definitions. Needs to be split into domain modules. |
| `convex/mealAnalysis.ts` | Domain Module | **694** | 300 | Bundles Zod response schemas, prompt constructors, Gemini text/photo actions, and DB synchronization functions. |
| `src/components/steadycut/sections/progress.tsx` | Feature TSX | **509** | 400 | Contains multiple charting elements, stats tables, and historical weight listing logic in the same file. |
| `src/components/steadycut/sections/habits.tsx` | Feature TSX | **473** | 400 | Combines habit lists, sorting controls, reordering animations, and forms inline. |
| `convex/mealLogs.ts` | Domain Module | **425** | 300 | Handles queries, internal mutations, stale cleaners, and CSV data helpers. |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Route Page | **108** | 40 | Houses inline configuration forms, style declarations, and branding blocks. |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Route Page | **108** | 40 | Identical to sign-in page, representing a copy-paste implementation. |
| `src/app/not-authorized/page.tsx` | Route Page | **60** | 40 | Displays redirect alerts, styles, and buttons inline. |

### Code Duplication Patterns
1. **Authentication Screens**: `sign-in/page.tsx` and `sign-up/page.tsx` share 73 duplicate lines (~68% duplication) configuring the Clerk layout, custom `AuthShell`, and `BrandMark` components.
2. **Date & Streak Calculation**: Sibling modules in `/progress`, `/insights`, and `/dashboard` repeat similar logic to parse check-in records, compute weight variances, and track daily consistency streaks.

### Security and Liveness Vulnerability: Timezone RangeError
In `convex/pushActions.ts` (lines 53-61), the reminder scheduler iterates through user subscriptions and calls `getLocalDateParts(subscription.timezone)`.
```typescript
for (const subscription of subscriptions) {
  const local = getLocalDateParts(subscription.timezone);
  // ...
}
```
* **Risk**: If a client registers a subscription containing an invalid timezone string (e.g. `"GMT+5"` or `"UTC+5:30"` instead of a standard IANA timezone like `"Asia/Kolkata"`), `Intl.DateTimeFormat(..., { timeZone })` will throw a fatal `RangeError`.
* **Impact**: Because the exception is unhandled, it will terminate the entire cron action, halting notification deliveries for all subsequent users in the queue.

---

## 4. Recommendations

To bring the codebase in line with `ARCHITECTURE.md` guidelines and address performance/security issues, we recommend the following refactoring steps:

### R1. Resolve Authentication Duplication and Bloat
- **Action**: Extract `clerkAppearance`, `AuthShell`, and `BrandMark` components from `sign-in/page.tsx` and `sign-up/page.tsx` into a single shared file: `src/components/steadycut/auth-shell.tsx`.
- **Outcome**: Reduces both route pages from 108 lines to under 30 lines, keeping them well below the 40-line limit.

### R2. Decompose Large Feature Files
- **Dashboard Screen**: Split `dashboard-screen.tsx` by moving `TodayCheckInCard`, `HabitsCard`, `WeightTrendCard`, and `CalorieOverviewCard` into a dedicated folder `src/components/steadycut/dashboard/`.
- **Photo Logging Workspace**: Split `photo-logging-workspace.tsx` into:
  - `MealWorkspacePanel.tsx` (for camera uploads and calorie estimation views).
  - `ScaleWorkspacePanel.tsx` (for scale photo confirmation and manual weight entry).
  - `HydrationWorkspacePanel.tsx` (for liquid level logs and quick-log buttons).
- **Live Coach Screen**: Extract streaming setups and WebRTC logic in `live-coach-screen.tsx` into a custom hook `useLiveCoachStream.ts`.

### R3. Partition Backend and Shared Domain Code
- **Shared Helpers**: Split `src/lib/steadycut.ts` into:
  - `src/lib/steadycut-types.ts` (type interfaces).
  - `src/lib/steadycut-demo.ts` (demo fixtures).
  - `src/lib/steadycut-calculations.ts` (trend and calorie stats calculations).
- **Convex AI split**: Extract schema models and retry fallbacks from `convex/mealAnalysis.ts` to `convex/ai/schemas.ts` and `convex/ai/retries.ts`.

### R4. Fix the Timezone RangeError Vulnerability
- Wrap `getLocalDateParts` inside a try-catch block within the cron loop in `convex/pushActions.ts` to log errors and continue processing subsequent reminders:
```typescript
for (const subscription of subscriptions) {
  try {
    const local = getLocalDateParts(subscription.timezone);
    if (local.hour !== subscription.reminderHourLocal || subscription.lastSentDate === local.date) {
      continue;
    }
    // send push logic...
  } catch (err) {
    console.error(`Failed to process reminder for user ${subscription.userId} due to timezone error:`, err);
  }
}
```
