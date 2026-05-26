# SteadyCut Architecture

SteadyCut is a private weight-loss consistency app. It combines a Next.js App
Router frontend, Convex backend, Clerk authentication, Gemini-powered meal and
coach analysis, PWA install assets, and web push reminders.

## Runtime Map

- `src/app/` contains Next.js routes. Keep route files thin and push feature
  behavior into `src/components/steadycut`, `src/features`, or `src/lib`.
- `src/components/app/` contains app-wide providers such as theme, Convex,
  Clerk-aware provider setup, and PWA registration.
- `src/components/steadycut/` contains the current product UI. Large files here
  should continue being split into focused feature components.
- `src/components/ui/` contains shadcn-style primitives. Treat these as shared
  design-system components.
- `src/lib/steadycut.ts` is the main shared domain module for demo data, app
  types, date helpers, dashboard stats, calorie stats, and display formatting.
- `convex/` contains Convex schema, queries, mutations, actions, auth helpers,
  cron jobs, uploads, meal analysis, scale analysis, push notifications, and
  generated Convex API bindings.
- `public/` contains app icons, SVGs, and the service worker.

## Frontend Flow

The home/dashboard route decides whether to run preview or live behavior based
on environment and service availability. Demo components use local fixture-like
data from `src/lib/steadycut.ts`. Live components call Convex through generated
API references from `convex/_generated`.

Main product surfaces:

- `/dashboard` renders the central overview, calorie/photo entry, check-in,
  trend, habit, and coach cards.
- `/coach` is the meal/photo logging surface.
- `/check-ins`, `/progress`, `/habits`, `/goals`, `/insights`, and `/settings`
  render section pages from the SteadyCut section components.
- `/offline` is the PWA fallback page.
- `src/proxy.ts` handles Next.js proxy behavior.

## Data Model

The Convex schema is in `convex/schema.ts`.

- `profiles`: per-user target and demographic settings.
- `habits`: configurable habit definitions and ordering.
- `checkIns`: daily weight, mood, notes, and completed habits.
- `coachMessages`: generated daily coaching output.
- `mealLogs`: photo-backed meal estimates and confirmed nutrition items.
- `scaleLogs`: scale photo readings and manual review state.
- `pushSubscriptions`: browser push endpoints and reminder settings.

Every user-owned table has a `userId` field. Convex functions should obtain the
current identity through `convex/lib/auth.ts` unless they are explicitly
internal and receive a trusted `userId`.

## AI Flow

Meal photo analysis lives in `convex/mealAnalysis.ts`. It validates input,
loads the uploaded photo from Convex storage, calls Gemini through the Vercel AI
SDK, normalizes the response, and saves via meal log mutations. Prompt text,
model constants, schema definitions, and known-food fallback data should stay
in focused modules under `convex/ai/`.

Daily coaching lives in `convex/coach.ts`. It summarizes recent dashboard data
and asks Gemini for motivational behavioral guidance. Keep coach output
non-medical and grounded in recent app data.

## Auth and Modes

Clerk provides authentication in live mode. Convex auth is configured by
`convex/auth.config.ts`, and user identity is read in `convex/lib/auth.ts`.

`STEADYCUT_LIVE_MODE=true` makes local routes require live services. Without
live mode and complete environment setup, routes should continue to render
preview/demo experiences.

## PWA and Push

PWA registration is handled from `src/components/app/pwa-registrar.tsx`, with
the service worker in `public/sw.js`. Push subscription CRUD is in
`convex/pushNotifications.ts`; push sending actions are in
`convex/pushActions.ts`; scheduled reminder jobs are in `convex/crons.ts`.

## Where To Change Things

| Task | Start Here |
| --- | --- |
| Add or rename a route | `src/app/**/page.tsx` |
| Change dashboard stats | `src/lib/steadycut.ts` |
| Change dashboard UI | `src/components/steadycut/dashboard-screen.tsx` |
| Change section pages | `src/components/steadycut/section-pages.tsx` |
| Change meal photo UI | `src/components/steadycut/photo-logging-workspace.tsx` |
| Change meal AI behavior | `convex/mealAnalysis.ts` and `convex/ai/` |
| Change coach AI behavior | `convex/coach.ts` |
| Change schema/tables | `convex/schema.ts` |
| Change auth assumptions | `convex/lib/auth.ts`, Clerk env, provider setup |
| Change push reminders | `convex/pushNotifications.ts`, `convex/pushActions.ts`, `convex/crons.ts`, `public/sw.js` |
| Change theme/app shell | `src/components/app/`, `src/components/steadycut/app-*`, `src/app/globals.css` |

## Refactor Direction

Prefer small extractions that preserve behavior:

- Pull duplicated display mappings into shared presentation modules.
- Move demo fixtures and pure calculations away from interactive components.
- Keep route components server-first where possible, and put browser-only
  behavior behind explicit `"use client"` boundaries.
- Split Convex AI files into prompt, schema, normalization, and fallback
  modules before changing model behavior.
- Add tests around pure domain logic before making broad behavior changes.

## Iteration Budget

Before adding a new file or component, first check whether the change can delete
duplication, reuse `src/lib/steadycut.ts`, or extend one existing focused
module. Prefer one well-named shared helper over repeated local helpers.

Useful targets:

- Keep `src/app/**/page.tsx` under about 40 lines.
- Keep feature TSX files under about 400 lines when practical.
- Keep pure domain modules under about 300 lines when practical.
- If a file crosses 800 lines, do not add another workflow to it; extract or
  delete nearby duplication first.

File count is not the goal. The goal is that a future agent can answer "where
does this behavior live?" without loading thousands of unrelated lines.
