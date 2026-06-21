# E2E Test Explorer Handoff Report

**Date**: 2026-06-05
**Author**: explorer_e2e_1

---

## 1. Observation

Direct observations from examining the codebase:

*   **Mobile Dashboard Tabs**: In `src/components/steadycut/dashboard-screen.tsx` (lines 172 and 270–342), the mobile view transitions between three tabs: `"summary"`, `"checkin"`, and `"analytics"`. The tab visibility is determined using logical short-circuits:
    ```tsx
    {mobileTab === "summary" && (
      <div className="flex flex-col gap-3 animate-page-fade">
    ```
    This completely unmounts and mounts tab elements during transitions.
*   **Safe Area Padding**:
    *   In `src/components/steadycut/mobile-bottom-nav.tsx` (line 85), the bottom navigation is defined as:
        ```className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgb(15_23_42/0.08)] backdrop-blur lg:hidden"```
    *   In `src/components/steadycut/mobile-bottom-nav.tsx` (lines 178–181), the `QuickLogSheet` is defined as:
        ```tsx
        <SheetContent
          className="max-h-[88svh] overflow-y-auto rounded-t-2xl p-0 glass-card bg-transparent border-t border-white/10 dark:border-white/5"
          side="bottom"
        >
        ```
        This sheet **lacks** a styling parameter representing `env(safe-area-inset-bottom)`.
*   **Responsive Charts**:
    *   In `src/components/steadycut/dashboard-screen.tsx` (line 1043), the chart is loaded via `ChartContainer` around an `AreaChart`.
    *   In `src/components/ui/chart.tsx` (lines 42-82), `ChartContainer` embeds a Recharts `ResponsiveContainer`.
    *   In `src/components/ui/card.tsx` (line 78), card content uses `min-w-0 px-4 group-data-[size=sm]/card:px-3`.
*   **Tailwind Setup**: `src/app/globals.css` imports Tailwind v4 directly (`@import "tailwindcss";` at line 1) and defines custom styles using `@theme` syntax instead of a `tailwind.config.ts`.
*   **Dependencies**: `package.json` contains `"next": "16.2.6"`, `"react": "19.2.4"`, `"vitest": "^4.1.8"`, `"recharts": "^3.8.0"`, and `"tailwindcss": "^4"`. It lacks browser simulation tools (`jsdom`, `@testing-library/react`) or end-to-end automation scripts (`playwright`).

---

## 2. Logic Chain

1.  **Tab Transitions vs. Scroll resets**: Because the application uses conditional short-circuit mapping (`mobileTab === "summary" && ...`) rather than layout preservation (e.g., hidden overlays or height-stable container wrappers), active cards are destroyed and rebuilt on every tab click. If the scroll position of the viewport exceeds the layout height of a newly activated tab, a scroll shift or jump occurs, resetting scroll position when returning.
2.  **Missing Safe Area on Bottom Sheets**: The bottom nav element `MobileBottomNav` properly applies `pb-[max(0.75rem,env(safe-area-inset-bottom))]`. However, both the `QuickLogSheet` in `mobile-bottom-nav.tsx` and the hydration sheet in `dashboard-screen.tsx` use the bottom `SheetContent` overlay with padding reset (`p-0`) and lack any bottom safe area padding rules. Under E2E notch-emulation testing, these elements will overlap with simulated gesture inputs, resulting in collision failures.
3.  **Responsive Chart Constraints**: At a 320px viewport, the horizontal card padding (`12px` layout padding on each side and `12px` card content padding on each side) restricts the available chart container width to exactly `272px`. Because Recharts SVG text nodes do not naturally wrap, placing many XAxis data points at this size will trigger label collisions or overflows unless tests actively assert no overlap between bounding boxes of adjacent SVG text elements.
4.  **Testing Environment Capabilities**: Testing layout bounding rects, device resize reflows, scroll state behavior, and CSS environmental variables (`env(...)`) is impossible within standard Node.js JSDOM/Happy-DOM test runs since JSDOM does not execute rendering and layout engines. Thus, Playwright is selected as the optimal runner for E2E validation, and Vitest+JSDOM is assigned to static DOM/class name assertion.

---

## 3. Caveats

*   **Authentication Bypass**: Testing clerk integrations in live mode requires complex configuration. Thus, E2E tests are designed to execute on the application's Demo mode (which runs out-of-the-box without requiring Clerk or Convex secrets).
*   **Real safe-area simulation limits**: Some headless browser configurations in Playwright might ignore `env(safe-area-inset-bottom)` unless it is emulated. We mitigate this by proposing CSS overrides in the test specs (`padding-bottom: max(12px, 34px) !important;`) to test the calculation limits.

---

## 4. Conclusion

We conclude that:
1.  A hybrid E2E test setup containing **Playwright** (for viewport emulations down to 320px, scroll height preservation tests, layout shifts, and safe area validation) and **Vitest + JSDOM** (for quick class name assertions) is the most robust strategy for these layout requirements.
2.  Code modifications (adding `pb-[env(safe-area-inset-bottom)]` to the bottom sheets) will be required to resolve safe-area overlaps on bezel-less screen viewports.

---

## 5. Verification Method

To verify the test suite configuration and system behavior:
1.  **Code Syntax and Typecheck**: Run `npm run typecheck` and `npm run lint` to ensure typescript integrity.
2.  **Dry Run Vitest Configuration**: Run `npm run test` (which triggers `vitest run`) once the config files are populated to confirm Vitest boots up and reads alias paths properly.
3.  **Validate Layout Class Presence**: Inspect `src/components/steadycut/mobile-bottom-nav.tsx` to verify that `pb-[max(0.75rem,env(safe-area-inset-bottom))]` is present.
4.  **Playwright Inspection**: Execute `npx playwright test` (once installed) and inspect generated HTML test report.

---

## 6. Remaining Work

Since this is a soft handoff:
1.  **Install dependencies**: A developer needs to run `npm install -D @playwright/test @testing-library/react @testing-library/jest-dom jsdom`.
2.  **Write configurations**: Populate the proposed `playwright.config.ts`, `vitest.config.ts`, and `src/setupTests.ts` in the root workspace folder.
3.  **Implement tests**: Create `e2e/dashboard-tabs.spec.ts`, `e2e/safe-area.spec.ts`, and `e2e/charts-responsiveness.spec.ts` in the root `e2e` folder.
4.  **Add package.json script**: Add `"test:e2e": "playwright test"` to the scripts block in `package.json`.
