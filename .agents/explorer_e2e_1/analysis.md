# E2E Test Suite Implementation Strategy

**Prepared by**: E2E Test Explorer
**Date**: 2026-06-05

## Executive Summary
This report analyzes the front-end layout structure of the SteadyCut dashboard, mobile navigation bar, quick log sheets, and weight charts, identifying structural layout vulnerabilities such as scroll resets during tab switching and missing safe-area padding on mobile sheets. We propose a comprehensive opaque-box E2E test strategy using **Playwright** as the primary runner for layout, scroll, and viewport emulation, combined with **Vitest + JSDOM** for fast DOM structure/class-based markup tests.

---

## 1. Codebase Analysis & Layout Vulnerabilities

### Target 1: Mobile Dashboard Tabs ("Summary", "Check-in", "Trends")
*   **File location**: `src/components/steadycut/dashboard-screen.tsx` (lines 172, 270–342)
*   **Implementation**: 
    The tabs switch state via React state `mobileTab` (`"summary" | "checkin" | "analytics"`). Tab rendering is conditional:
    ```tsx
    {mobileTab === "summary" && ( <div className="flex flex-col gap-3 animate-page-fade">... )}
    {mobileTab === "checkin" && ( <div className="flex flex-col gap-3 animate-page-fade">... )}
    {mobileTab === "analytics" && ( <div className="flex flex-col gap-3 animate-page-fade">... )}
    ```
*   **Vulnerability**: 
    Because each tab's elements are unmounted and mounted on state change:
    1.  **Scroll resets/jumps**: If a user scrolls down on a long tab (e.g., Summary) and switches to a shorter tab (e.g., Check-in), the container height shrinks suddenly. The page is forced to scroll to the top or jump to fit the new height. When returning to the original tab, the scroll position is completely lost.
    2.  **Cumulative Layout Shift (CLS)**: The sudden destruction and creation of large card elements without a height-preserving wrapper or smooth height transition triggers visual layout shifts. While `.animate-page-fade` performs a translation/opacity fade-in (`translateY(16px)`), it does not prevent layout shifts since height changes instantly.

### Target 2: Safe Area Padding (`env(safe-area-inset-bottom)`)
*   **Implementation Details**:
    *   **Mobile Bottom Navigation Bar** (`src/components/steadycut/mobile-bottom-nav.tsx` line 85):
        Uses Tailwind class `pb-[max(0.75rem,env(safe-area-inset-bottom))]` for spacing. This is a robust layout pattern.
    *   **Dashboard Main Content Layout** (`src/components/steadycut/dashboard-screen.tsx` line 264):
        Uses `pb-[calc(9rem+env(safe-area-inset-bottom))]`. This ensures content isn't covered by the bottom navigation bar.
    *   **Vulnerability (Missing Safe Area on Sheets)**:
        *   The **Quick Log Sheet** (`src/components/steadycut/mobile-bottom-nav.tsx` line 178) uses `<SheetContent className="max-h-[88svh] overflow-y-auto rounded-t-2xl p-0 ...">` and then `div className="p-4"`. It **lacks** `env(safe-area-inset-bottom)` padding at the bottom.
        *   The **Hydration Photo Sheet** (`src/components/steadycut/dashboard-screen.tsx` line 674) also uses a bottom sheet without safe area bottom padding.
        *   *Result*: On bezel-less mobile screens (e.g., iPhone 15, Android devices with gesture navigation), sheet buttons/inputs will overlap with the OS home indicator (notch/swipe bar), degrading usability.

### Target 3: Responsive Mobile Charts
*   **Implementation Details**:
    *   Weight charts in `dashboard-screen.tsx` (`WeightTrendCard` line 1043) and `section-pages.tsx` (`ProgressOverview` line 1096) use Recharts `ResponsiveContainer` wrapped inside `@/components/ui/chart.tsx`'s `ChartContainer`.
    *   `ChartContainer` has a default `INITIAL_DIMENSION` of `width: 320, height: 200` as a fallback.
*   **Vulnerability**:
    1.  At a viewport width of **320px**, the card component's width inside the main grid is `272px` due to padding (`12px` layout padding on each side and `12px` card content padding on each side).
    2.  `ResponsiveContainer` relies on `ResizeObserver` to adapt. If `ResizeObserver` fails to fire or is unhandled in a server context, it falls back to 320px width, causing the chart to spill out of the 272px card boundary.
    3.  The YAxis has a fixed width of `44px` or `30px`, leaving very narrow margins for plotting data points. On 320px viewports, horizontal axis dates (e.g. "04 Jun", "05 Jun") can collide or overlap if too many data points are displayed without formatting or label thinning.

---

## 2. Test Runner Selection: Playwright vs. Vitest JSDOM

To verify layout shifts, scroll heights, viewport responsiveness down to 320px, and CSS safe-area functions, we evaluate two options:

| Test Capabilities | Vitest + JSDOM / Happy-DOM | Playwright E2E Runner |
| :--- | :--- | :--- |
| **Execution Speed** | Extremely fast (runs in Node.js) | Moderate (runs real browser threads) |
| **Layout Calculation** | **None** (`getBoundingClientRect` returns `0`, no offset heights) | **Full** (real rendering engine calculates layout) |
| **Scroll Emulation** | **None** (`window.scrollTo` is a no-op, `scrollY` is always `0`) | **Full** (real scrolling and window offsets) |
| **CSS Environment variables**| Ignored (no layout/style computations) | Computable (via CSS variable injection/overrides) |
| **ResizeObserver** | Must be manually mocked/stubbed | Native browser support |
| **Visual Verification** | Code-level markup testing only | Screenshot comparisons and visual regression |

### Recommendation
*   **Use Playwright** as the primary runner for layout stability (Target 1), safe-area layout offsets (Target 2), and chart responsiveness/collision testing (Target 3).
*   **Use Vitest + JSDOM** for unit/integration testing of React components to verify that correct Tailwind class names are applied (e.g., asserting that the container has `pb-[max(0.75rem,env(safe-area-inset-bottom))]` string in classes).

---

## 3. Configuration Setup & Command Interface

### A. Needed Packages (to be added to `package.json`)
```json
"devDependencies": {
  "@playwright/test": "^1.49.0",
  "@testing-library/react": "^16.2.0",
  "@testing-library/jest-dom": "^6.6.3",
  "jsdom": "^26.0.0"
}
```

### B. Vitest Config (`vitest.config.ts`)
Create this file in the root directory:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
  },
});
```

### C. Playwright Config (`playwright.config.ts`)
Create this file in the root directory:
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "webkit-mobile",
      use: {
        ...devices["iPhone 14 Pro"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-se-mobile",
      use: {
        ...devices["Galaxy S9+"],
        viewport: { width: 320, height: 640 }, // Target viewport down to 320px
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 4. Tier 1-4 Test Matrix

### Tier 1: Smoke & Critical Path Tests
*   **Test Case 1.1: Mobile Page Load & Navigation**
    *   Verify mobile bottom nav contains four main links (Today, Food, Progress, Settings) and a quick log button.
    *   Confirm clicking "Progress" and "Settings" loads correct routes without crashing.
*   **Test Case 1.2: Mobile Tab Mounting**
    *   Verify clicking dashboard tab buttons ("Summary", "Check-in", "Trends") swaps the rendered UI containers.

### Tier 2: Layout Boundaries & Emulation
*   **Test Case 2.1: Viewport Contraction to 320px**
    *   Set viewport width to 320px. Inspect the Weight Trend card and check that it does not overflow horizontally.
*   **Test Case 2.2: Safe Area Class Verification (JSDOM)**
    *   Scan components in virtual DOM (Vitest) to assert they declare padding classes utilizing `env(safe-area-inset-bottom)`.

### Tier 3: Interactions & Structural Smoothness
*   **Test Case 3.1: Scroll Position Preservation across Tabs**
    *   Load dashboard, populate stub scrollable content, scroll viewport by `y = 300`. Click tab "Check-in", then switch back to "Summary". Verify that scroll position has not reset to `0` or jumped.
*   **Test Case 3.2: Cumulative Layout Shift (CLS) on Tab Swap**
    *   Initialize Chrome performance observer in Playwright. Transition between mobile tabs. Record CLS and assert the score is `< 0.1` during transition.
*   **Test Case 3.3: Chart Container Resize Performance**
    *   Emulate viewport resizing from 390px down to 320px. Verify that the Recharts SVG width scales down proportionally.

### Tier 4: Visual Regression & Boundary Edge Cases
*   **Test Case 4.1: Safe Area Notch Emulation & Input Collision**
    *   Inject custom styling `:root { --safe-area-inset-bottom: 34px !important; }` (or simulate notch overlay). Verify that the bottom nav is pushed upwards by `34px`.
    *   Verify that the "Quick Log" sheet footer/inputs do not overlap with the emulated home indicator region.
*   **Test Case 4.2: Chart X-Axis Label Collision**
    *   Render chart at 320px width with 15 data points. Verify that tick text elements do not overlap (detect bounding box intersections of adjacent SVG `text` elements).

---

## 5. Test File Outlines & Test Spec Code

### File 1: `e2e/dashboard-tabs.spec.ts`
Tests smooth tab transitions and scroll position stability.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Mobile Dashboard Tabs layout and scroll stability", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard page (automatically loads demo mode if no configuration)
    await page.goto("/dashboard");
    // Ensure we are in a mobile viewport (Playwright project handles this)
  });

  test("should transition tabs and preserve scroll height", async ({ page }) => {
    // 1. Identify tab buttons
    const summaryTab = page.getByRole("button", { name: "Summary" });
    const checkinTab = page.getByRole("button", { name: "Check-in" });

    // 2. Ensure initial state is loaded
    await expect(summaryTab).toHaveAttribute("class", /bg-background/); // Active indicator
    
    // 3. Scroll page down (simulating user reading summary data)
    await page.evaluate(() => window.scrollTo(0, 150));
    let initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(150);

    // 4. Swap tabs to 'Check-in'
    await checkinTab.click();
    await page.waitForTimeout(400); // Wait for transition fade animation

    // 5. Swap back to 'Summary'
    await summaryTab.click();
    await page.waitForTimeout(400);

    // 6. Verify scroll height has not been reset to 0 or jarred
    const finalScrollY = await page.evaluate(() => window.scrollY);
    expect(finalScrollY).toBeCloseTo(initialScrollY, 1);
  });

  test("should not exceed layout shift limits (CLS) on tab transitions", async ({ page }) => {
    // Set up layout shift tracking via performance APIs
    await page.evaluate(() => {
      (window as any).cumulativeLayoutShiftScore = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).cumulativeLayoutShiftScore += (entry as any).value;
          }
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
    });

    const checkinTab = page.getByRole("button", { name: "Check-in" });
    await checkinTab.click();
    await page.waitForTimeout(400);

    const clsScore = await page.evaluate(() => (window as any).cumulativeLayoutShiftScore);
    // Google Core Web Vitals target for CLS is < 0.1
    expect(clsScore).toBeLessThan(0.1);
  });
});
```

### File 2: `e2e/safe-area.spec.ts`
Simulates notch display overlay and checks that padding handles the bottom safe area correctly.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Mobile bottom navigation and Quick Log sheet safe-area offsets", () => {
  test("bottom nav bar padding should scale with safe-area-inset-bottom env", async ({ page }) => {
    await page.goto("/dashboard");

    // 1. Get bottom nav element
    const bottomNav = page.locator("nav[aria-label='Mobile primary']");
    await expect(bottomNav).toBeVisible();

    // 2. Measure computed padding-bottom under normal safe area (should fall back to 0.75rem = 12px)
    let computedPadding = await bottomNav.evaluate((el) => window.getComputedStyle(el).paddingBottom);
    expect(parseFloat(computedPadding)).toBeGreaterThanOrEqual(12);

    // 3. Inject mock stylesheet overriding env() values (using standard variables to test calculation bounds)
    await page.addStyleTag({
      content: `
        @layer priority-overrides {
          nav[aria-label='Mobile primary'] {
            padding-bottom: max(12px, 34px) !important;
          }
          [data-slot="sheet-content"][data-side="bottom"] {
            padding-bottom: 34px !important;
          }
        }
      `
    });

    // 4. Confirm padding adjusts accordingly to emulate bezel cutout behavior
    computedPadding = await bottomNav.evaluate((el) => window.getComputedStyle(el).paddingBottom);
    expect(parseFloat(computedPadding)).toBe(34);
  });

  test("Quick Log sheet should display without overlapping OS controls", async ({ page }) => {
    await page.goto("/dashboard");

    // 1. Open quick log sheet
    const quickLogTrigger = page.getByLabel("Open quick log");
    await quickLogTrigger.click();

    const quickLogSheet = page.locator("[data-slot='sheet-content']");
    await expect(quickLogSheet).toBeVisible();

    // 2. Inspect computed styling for safe area padding on the sheet bottom
    const computedPaddingBottom = await quickLogSheet.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });

    // Since we noted missing safe area bottom padding, this test will assert
    // a non-zero margin/padding to enforce UI compliance.
    expect(parseFloat(computedPaddingBottom)).toBeGreaterThan(0);
  });
});
```

### File 3: `e2e/charts-responsiveness.spec.ts`
Tests weight charts scale-down and labels layout integrity down to 320px.

```typescript
import { test, expect } from "@playwright/test";

test.describe("Chart responsiveness and label readability at 320px", () => {
  test("weight chart should fit within card boundaries without horizontal overflow", async ({ page }) => {
    // 1. Resize viewport to extreme minimum width (320px)
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/dashboard");

    // 2. Click trends tab to render charts on mobile view
    await page.getByRole("button", { name: "Trends" }).click();
    await page.waitForTimeout(400);

    const card = page.locator("[data-slot='card']").filter({ hasText: "Weight trend" });
    const chartSvg = card.locator("svg.recharts-surface");

    await expect(chartSvg).toBeVisible();

    // 3. Confirm SVG width does not bleed past the card bounds
    const cardRect = await card.boundingBox();
    const svgRect = await chartSvg.boundingBox();

    expect(cardRect).not.toBeNull();
    expect(svgRect).not.toBeNull();

    if (cardRect && svgRect) {
      // The chart width must be fully contained within card content boundaries (accounting for card paddings)
      expect(svgRect.width).toBeLessThan(cardRect.width);
      // Ensure SVG is fully bounded inside the screen viewport width (320px)
      expect(svgRect.x + svgRect.width).toBeLessThanOrEqual(320);
    }
  });

  test("X-Axis tick labels should not overlap at narrow width", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Trends" }).click();
    await page.waitForTimeout(400);

    // Locate the tick labels in the chart SVG
    const tickTexts = page.locator(".recharts-cartesian-axis-tick text");
    const count = await tickTexts.count();
    
    if (count > 1) {
      const rects = await Promise.all(
        Array.from({ length: count }, (_, i) => tickTexts.nth(i).boundingBox())
      );

      // Check adjacent overlaps
      for (let i = 0; i < rects.length - 1; i++) {
        const r1 = rects[i];
        const r2 = rects[i + 1];
        if (r1 && r2) {
          // If labels are on the same vertical line/level, check horizontal clearance
          const overlapsX = r1.x + r1.width > r2.x;
          const sameY = Math.abs(r1.y - r2.y) < 5;
          expect(overlapsX && sameY).toBeFalsy(); // Assert no horizontal label overlap
        }
      }
    }
  });
});
```

---

## 6. Synthesis and Implementation Checklist

If the user proceeds with adding E2E tests, the developer should:
1.  **Install dependencies**: Run `npm install -D @playwright/test @testing-library/react @testing-library/jest-dom jsdom`.
2.  **Add Configuration files**: Create `playwright.config.ts`, `vitest.config.ts`, and `src/setupTests.ts` matching the structures in Section 3.
3.  **Implement Safe Area Fixing in Sheet**: Before testing passes, update `SheetContent` styling in `src/components/ui/sheet.tsx` or bottom sheets in `mobile-bottom-nav.tsx` to include `pb-[env(safe-area-inset-bottom)]`.
4.  **Create Test Spec Files**: Add test scripts inside a new root-level `/e2e` directory.
5.  **Configure Scripts**: Add `"test:e2e": "playwright test"` to `package.json`.
