# Frontend Architecture Exploration Report — SteadyCut

This report provides a detailed analysis of the SteadyCut frontend architecture, focusing on the Next.js 16.2.6 App Router structure, component boundaries, styling configurations, and key component-to-route mappings.

---

## 1. Observation

During our read-only investigation of the `testing` workspace frontend, we observed the following directory and configuration layouts:

### Next.js App Router Structure (`src/app/`)
The routing structure utilizes the Next.js 16.2.6 App Router convention, located under `src/app/`:
- **Root Layout (`src/app/layout.tsx`)**: Configures fonts (Geist Sans, Geist Mono), app-wide metadata, dynamic viewport settings, an inline blocking script (`themeScript`) to prevent theme flashes, and wraps the app in `RootProviders` (lines 78-87):
  ```tsx
  <RootProviders
    clerkPublishableKey={
      hasCoreServerConfig
        ? (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim()
        : ""
    }
    convexUrl={(process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim()}
  >
    {children}
  </RootProviders>
  ```
- **Page Transitions (`src/app/template.tsx`)**: Renders route-based transition animations using a client-side pathname-key wrapper (lines 10-15):
  ```tsx
  <div
    key={pathname}
    className="animate-page-fade flex flex-1 flex-col min-h-0 min-w-0"
  >
    {children}
  </div>
  ```
- **Landing Surface (`src/app/page.tsx`)**: Directs logged-in, authenticated users to `/dashboard` (lines 11-17) or displays the public landing component (`PublicEntry`):
  ```tsx
  if (hasCoreServerConfig) {
    const user = await getOptionalAppUser();
    if (user) {
      redirect("/dashboard");
    }
  }
  return <PublicEntry missingItems={getMissingSetupItems()} />;
  ```
- **Gemini Live Route Handler (`src/app/api/live-coach/token/route.ts`)**: Establishes short-lived auth tokens for live audio/visual Gemini coaching sessions by interfacing with `@google/genai` (lines 56-59):
  ```tsx
  const client = new GoogleGenAI({
    apiKey: serverConfig.geminiApiKey,
    httpOptions: { apiVersion: "v1alpha" },
  });
  ```
- **App Screens (with `page.tsx` and sibling `loading.tsx` loaders)**:
  - `/dashboard`: Main stats view (`src/app/dashboard/page.tsx`).
  - `/coach`: Meal/photo logging screen (`src/app/coach/page.tsx`).
  - `/check-ins`: Weight and habit logger list (`src/app/check-ins/page.tsx`).
  - `/progress`: Detailed weight charts and historical records (`src/app/progress/page.tsx`).
  - `/habits`: Habit configuration page (`src/app/habits/page.tsx`).
  - `/goals`: User goal-setting options (`src/app/goals/page.tsx`).
  - `/insights`: Analytical user advice (`src/app/insights/page.tsx`).
  - `/settings`: Profile adjustments (`src/app/settings/page.tsx`).
  - `/live-coach`: Real-time audio assistant (`src/app/live-coach/page.tsx`).
  - `/offline` & `/not-authorized`: Secondary boundary pages.

### Client/Server Component Boundaries (`src/components/`)
We verified that `src/features/` does not exist. All application components are stored under `src/components/` and are organized as:
- **`src/components/app/`**: Root configurations (`theme-provider.tsx`, `pwa-registrar.tsx`, `root-providers.tsx`).
- **`src/components/steadycut/`**: Main application logic components (`dashboard-screen.tsx`, `photo-logging-workspace.tsx`, `mobile-bottom-nav.tsx`, etc.).
  - Sibling sub-directory **`src/components/steadycut/sections/`** contains specific route page contents (`check-ins.tsx`, `coach.tsx`, `goals.tsx`, `habits.tsx`, `insights.tsx`, `progress.tsx`, `settings.tsx`, `shared.tsx`).
- **`src/components/ui/`**: Shared Shadcn style UI primitives (`button.tsx`, `card.tsx`, `sheet.tsx`, `chart.tsx`, `dialog.tsx`, etc.).

**Boundary Behaviors**:
1. Next.js pages (`src/app/**/page.tsx`) act as Server Component entry points. They execute server-side functions (e.g. `getAppRouteContext()`), verify user authentication credentials through Clerk, and check server environment setup before rendering client components.
2. The route page components delegate UI rendering to Client Components by importing them. Client Components use `"use client"` and interact with Clerk auth hooks or Convex hooks (`useQuery`, `useMutation`, `useAction`).
3. Out of 124 files, we identified 43 files declaring `"use client"`, covering all components under `src/components/steadycut/` and `src/components/ui/` that handle interactivity (such as sliders, forms, charts, and sheet dialogs).

### Styling Configuration (`src/app/globals.css`)
- **Tailwind Version**: Tailwind CSS v4 is used. The workspace lacks a traditional `tailwind.config.js/ts`, configuring themes instead through `@import "tailwindcss";` and `@theme inline` blocks in `src/app/globals.css` (lines 7-49).
- **Fonts**: Geist Sans and Geist Mono are imported from `next/font/google` in `layout.tsx` (lines 7-15) and exposed as Tailwind classes:
  - Sans: `--font-sans: "Geist", "Geist Fallback", ui-sans-serif, system-ui, sans-serif;`
  - Mono: `--font-mono: "Geist Mono", "Geist Mono Fallback", ui-monospace, monospace;`
- **Theme Variables**: Colors are defined using the perceptually uniform `oklch()` color space. The light background is `oklch(0.993 0.002 145)` (wellness-oriented light green hue) and the dark background is `oklch(0.135 0.004 260)` (deep charcoal-blue hue).
- **Premium Style Additions**:
  - `.glass-card`: Glassmorphism using `backdrop-filter: blur(16px) saturate(120%);` and subtle border/shadow layouts.
  - `.spring-bounce`: Elevating hover animations using `cubic-bezier(0.34, 1.56, 0.64, 1)` and brand glows.
  - `.glow-highlight-primary`: Pulsating, animated gradient border indicating loading or active state.
  - `.hydration-bubble-water` and `.hydration-wave`: Dynamic water level wave animation for hydration logging.
  - `.animate-page-fade`:Snappy page entry transitions (0.35s).
  - Transition suppression is implemented in `theme-provider.tsx` to prevent theme "flashbangs" when switching light/dark preferences.

---

## 2. Logic Chain

Based on our observations, we deduced the following engineering design choices in the frontend codebase:

1. **Authentication and Demo/Live Dual Mode Execution**:
   - Each route page relies on `getAppRouteContext()` in `src/lib/app-route.ts`.
   - `getAppRouteContext()` checks whether Clerk and Convex environment keys are fully configured (`hasCoreServerConfig`).
   - If keys are missing, the context mode is set to `"demo"`, rendering client components populated with dummy mock data from `src/lib/steadycut.ts` (e.g. `createDemoDashboardData()`).
   - If keys exist, it calls `requireAppUser()`, redirects unauthenticated users to `/sign-in`, and passes a `"live"` mode flag to the page components, which then invoke live Convex backend endpoints.
   
2. **Preventing Layout Shifts (CLS) and Flashing Skeletons**:
   - The frontend retrieves the main dashboard records via Convex queries in `DashboardQueryProvider` (`src/components/steadycut/dashboard-query-provider.tsx`).
   - Since network queries cause rendering lag, the provider caches query results in a module-level `Map` indexed by `userId`.
   - It binds the cache to React components using `useSyncExternalStore`. Consequently, when navigating routes or reloading, the cached data renders immediately instead of showing a flashing skeleton, and is seamlessly updated once the live query resolves.
   - For chart responsiveness, `ProgressChart` sets an `initialDimension={{ height: 240, width: 400 }}` parameter to hold visual space during initial render.

3. **PWA, Safe Area, and Responsive Navigation Logic**:
   - `PwaRegistrar` registers `/sw.js` in secure contexts to enable offline usage. Sibling page `/offline` acts as the service worker's standard fallback interface.
   - On mobile viewports, `MobileBottomNav` is rendered at the bottom of the viewport. To handle modern smartphones with bottom notch bars, it uses CSS safe-area variables `pb-[max(0.75rem,env(safe-area-inset-bottom))]` to avoid overlapping.
   - To avoid React Server Component hydration mismatches with browser-only features in the bottom nav, `MobileAppChrome` is loaded dynamically on the client side with `ssr: false`.

---

## 3. Caveats

- **No `src/features/` directory**: Although `ARCHITECTURE.md` refers to `src/features/`, this directory does not exist. All UI screen modules are grouped under `src/components/steadycut/sections/`.
- **Read-Only Verification constraints**: Since this is a read-only exploration, we validated code behavior via static inspection, TypeScript type-checks (`npm run typecheck`), ESLint validations, and unit tests (`npm run test`). We did not run a local dev server to visually inspect the browser runtime.

---

## 4. Conclusion

SteadyCut has a highly modular Next.js 16.2.6 frontend architecture.
1. The codebase divides pages into clean Server Components that handle routing and auth, while rendering Client Components for rich interactivity.
2. The UI is designed for mobile-first wellness tracking. Features like cache-preserving query syncs (`useSyncExternalStore`), safe-area padded bottom tabs, and dynamic imports (`ssr: false` / `dynamic()`) show high attention to detail regarding Cumulative Layout Shift (CLS) and mobile UX.
3. The styling utilizes a modern Tailwind CSS v4 pipeline combined with OKLCH color spaces, CSS custom variables, and keyframe animations to produce a premium visual design.

---

## 5. Verification Method

To independently verify the frontend architecture:
1. **Compilation Check**: Run `npm run typecheck` inside the root directory `c:\Users\Rohit Singh\Desktop\testing\`. It runs `tsc --noEmit` and should compile without errors.
2. **Linter Check**: Run `npm run lint`. It runs `eslint` and should output zero errors (only 2 unused-variable warnings in `mobile-bottom-nav.tsx` are expected).
3. **Unit Tests**: Run `npm run test`. It runs `vitest run` on unit test targets (e.g. `src/lib/steadycut.test.ts`) and must report all 5 tests passing.
4. **Inspection targets**:
   - Inspect `src/app/globals.css` to verify Tailwind v4 `@theme` configuration.
   - Inspect `src/components/steadycut/dashboard-query-provider.tsx` to review the `useSyncExternalStore` layout-shift mitigation logic.
   - Inspect `src/components/steadycut/mobile-bottom-nav.tsx` to verify the CSS safe-area bottom padding.
