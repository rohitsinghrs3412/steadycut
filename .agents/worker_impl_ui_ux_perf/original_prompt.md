## 2026-06-05T01:45:28Z

You are the teamwork_preview_worker for the SteadyCut optimization project.
Your identity and working directory details are:
- Archetype: teamwork_preview_worker
- Working directory: c:\Users\Rohit Singh\Desktop\testing\.agents\worker_impl_ui_ux_perf\
- Parent conversation ID: 0a20f707-0763-4c73-be8d-f0d2fbf29c93

Your mission:
Implement mobile UI/UX enhancements and performance optimizations based on the codebase explorer's findings.

MANDATORY INTEGRITY WARNING — DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Here is the list of changes you must implement:

1. **Viewport & Layout Viewport Fit:**
   - In `src/app/layout.tsx`, add `viewportFit: "cover"` to the `Viewport` config object.
   - Example:
     ```typescript
     export const viewport: Viewport = {
       colorScheme: "light dark",
       themeColor: [
         { media: "(prefers-color-scheme: light)", color: "#f9fbf8" },
         { media: "(prefers-color-scheme: dark)", color: "#070a10" },
       ],
       viewportFit: "cover",
     };
     ```

2. **Top Notch Safe-Area Support in Headers:**
   - Modify the sticky headers in `src/components/steadycut/app-page-shell.tsx` and `src/components/steadycut/dashboard-screen.tsx`.
   - Update their padding or layout to account for top safe area padding, e.g., using `pt-[env(safe-area-inset-top)]` or relative Tailwind safe area classes, ensuring they look correct and have proper spacing when standalone.

3. **Bottom Safe Area Padding for Drawers and Sheets:**
   - In `src/components/steadycut/mobile-bottom-nav.tsx` (the quick log sheet dialog), add bottom safe area padding `pb-[max(1rem,env(safe-area-inset-bottom))]` (or tailwind equivalent) to `SheetContent` / dialog layout container to prevent home indicator overlap.
   - In `src/components/steadycut/app-sidebar.tsx`, add top safe area and bottom safe area padding to prevent overlaps in the navigation drawer sidebar content.

4. **Dynamic Imports of Heavy components:**
   - In `src/components/steadycut/dashboard-screen.tsx`, dynamically import `PhotoLoggingWorkspace` and the new extracted `WeightTrendCard` (so Recharts is lazy loaded).
   - In `src/app/live-coach/page.tsx`, dynamically import `LiveCoachScreen`.
   - In `src/components/steadycut/section-pages.tsx`, dynamically import `PhotoLoggingWorkspace`.

5. **Recharts Bundle Splitting:**
   - Extract `WeightTrendCard` containing Recharts from `src/components/steadycut/dashboard-screen.tsx` to a new component file `src/components/steadycut/weight-trend-card.tsx`.
   - Dynamically import it in `dashboard-screen.tsx` using `dynamic(() => import("./weight-trend-card").then(m => m.WeightTrendCard), { ssr: false })` (or similar).

6. **Split Monolithic Section Pages:**
   - Split `src/components/steadycut/section-pages.tsx` into individual section components inside a new directory `src/components/steadycut/sections/` (e.g. `check-ins.tsx`, `coach.tsx`, `progress.tsx`, `habits.tsx`, `insights.tsx`, `goals.tsx`, `settings.tsx`).
   - Move all supporting helper functions and child components (like `SetupOnlySection`, `StatCard`, `RecentCheckInsList`, `ProgressOverview`, etc.) to appropriate locations so that code duplication is avoided, or keep shared helpers in a shared file under `src/components/steadycut/sections/` if they are reused.
   - Dynamically import any heavy components or charts inside these individual section components where appropriate (e.g. dynamic import of Recharts in `progress.tsx` or using lazy load).
   - Update the Next.js routes in `src/app/check-ins/page.tsx`, `src/app/coach/page.tsx`, `src/app/goals/page.tsx`, `src/app/habits/page.tsx`, `src/app/insights/page.tsx`, `src/app/progress/page.tsx`, `src/app/settings/page.tsx` to import from their respective split files instead of the monolithic `section-pages.tsx`.
   - Ensure `section-pages.tsx` is either deleted or kept clean if any other components import it.

7. **Avoid Duplicate DOM Trees Rendering in `dashboard-screen.tsx`:**
   - In `dashboard-screen.tsx`, both the mobile layout (hidden on lg screens) and the desktop layout (hidden on mobile) are mounted simultaneously.
   - Optimize this by using a react state/media query hook (e.g. `useIsMobile`) to mount only the active layout client-side. Make sure to handle hydration carefully (e.g. returning `null` or a default state during SSR, and then updating on client mount) to prevent hydration mismatches.

8. **Fix Chart Container Layout Shifts (CLS):**
   - Provide exact matching `initialDimension` values to `ChartContainer` instances in `dashboard-screen.tsx` and the progress section component to match their CSS heights (e.g. 170px, 230px, 240px, 300px).

**Verification requirements:**
- After making these changes, run the following verification checks:
  1. `npm run lint`
  2. `npm run typecheck`
  3. `npm run test`
  4. `npm run build`
- Verify that they all complete successfully without errors or bundle compilation warnings.
- Write a detailed report of the changes made, the file diffs, and verification check outputs in `changes.md` and `handoff.md` in your working directory.
- Communicate completion to your parent via send_message.
