# SteadyCut E2E Test Suite Infrastructure & Architecture

This document describes the testing philosophy, feature inventory, architecture, configurations, and coverage guidelines for the SteadyCut E2E test suite.

---

## 1. Test Philosophy

SteadyCut employs an **opaque-box, requirement-driven testing approach**. Instead of testing internal React states, mock objects, or database structures directly, we verify that the application behaves exactly as a real user expects under realistic environments (specifically mobile viewports down to 320px).

Key tenets include:
*   **Behavioral Verification**: We locate elements by user-visible text, roles (e.g. `button`, `link`), or accessible attributes rather than internal CSS class names or test IDs, ensuring the tests survive refactoring.
*   **Constraint-Driven Validation**: Layout shifts, safe areas, responsiveness, and viewport transitions are asserted using real browser metrics (e.g., PerformanceObserver API for CLS, computed styles for padding, and SVG bounding boxes for collision detection).
*   **Asynchronous Resilience**: Tests are resilient to network latency and client-side page load/hydration timing.

---

## 2. Feature Inventory & Mapping to Requirements

Here is the inventory of features covered in this suite and their mapping to E2E test requirements:

| Feature Area | User Requirement / Scenario | Test Case | Target Metric / Assertion |
|---|---|---|---|
| **Dashboard Navigation** | Mobile tab switching preserves state, changes view content correctly, and maintains scroll position. | `e2e/dashboard-tabs.spec.ts` | Tab swaps render correct card titles, `window.scrollY` remains constant, and Cumulative Layout Shift (CLS) is `< 0.1`. |
| **Mobile Chrome Layout** | Bottom navigation bar does not cover or overlap with the system controls (home indicator/buttons) on mobile devices. | `e2e/safe-area.spec.ts` | Computed `padding-bottom` on `nav` is `>= 12px` (`0.75rem`). |
| **Quick Log Sheet** | The sheet sheet must account for the OS notch/bottom bar to prevent overlap. | `e2e/safe-area.spec.ts` | Computed `padding-bottom` on `role="dialog"` is `>= 16px` (`1rem`). |
| **Responsive Charts** | Weight Trend AreaChart must scale down to 320px viewport without clipping or escaping its Card container. | `e2e/charts-responsiveness.spec.ts` | Bounding box width of Chart `[data-slot="chart"]` is `<` Card width, and `> 0`. |
| **Chart Label Collisions** | X-Axis labels on Recharts must remain readable on narrow screens without overlapping or colliding. | `e2e/charts-responsiveness.spec.ts` | Bounding boxes of X-axis `<text>` tick elements must not overlap horizontally (`right_x <= next_left_x`). |
| **End-to-End User Flow** | A user should be able to view their dashboard, switch tabs, log meals/weight via the Quick Log, navigate to progress trends, and return. | `e2e/real-world-scenarios.spec.ts` | E2E journey flow completes: dashboard -> tab switch -> open/close sheet -> progress route -> return dashboard. |

---

## 3. Test Architecture

The E2E testing infrastructure is built on **Playwright**.

### Directory Structure
```
├── e2e/
│   ├── dashboard-tabs.spec.ts       # Tab transitions, scroll state, and CLS
│   ├── safe-area.spec.ts            # Safe area inset padding checks
│   ├── charts-responsiveness.spec.ts # Responsive width, X-axis label collision
│   └── real-world-scenarios.spec.ts # Simulates full mobile user journey
├── playwright.config.ts             # Playwright runner configuration
└── TEST_INFRA.md                    # This architecture document
```

### Playwright Config (`playwright.config.ts`) Details
*   **Web Server Configuration**: Starts `npm run dev` to serve the Next.js App Router on `http://localhost:3000`. Reuses the server locally and spins it up fresh on CI.
*   **Target Environments**:
    1.  **Webkit Mobile (iPhone 14 Pro)**: Tests Safari rendering with a viewport of `390x844`.
    2.  **Chromium Mobile (Galaxy S9+)**: Tests Chrome/Blink rendering with a viewport overridden to `320x640` to assert styling holds at the extreme mobile limit.
*   **Reporter**: Uses the `list` reporter for clean terminal logging.

---

## 4. Real-World Application Scenarios

The suite models the user's daily habits:
1.  **Check-in & Verification**: User launches the PWA, verifies they are on track via the Summary tab, switches to the Check-in tab to see their active habits, and checks Trends to look at their weight progress.
2.  **Logging Event**: User taps the middle Quick Log button to log photos/meals. The modal slides up with adequate safe area margin so they don't accidentally exit or trigger mobile system gestures.
3.  **Analytics Drill Down**: User navigates to the `/progress` route using the mobile tab bar to analyze historical metrics, then returns back home to Today.

---

## 5. Coverage Thresholds (Tiers 1-4)

To ensure high-quality releases, we organize testing into four minimum coverage tiers:

*   **Tier 1: Critical Infrastructure & Authentication (Goal: 100% Pass)**
    *   Application loads without errors, server environment starts correctly, base routes are functional.
*   **Tier 2: User Journeys & State Navigation (Goal: 100% Pass)**
    *   Transition tabs correctly swap DOM elements.
    *   Full user journey executes from dashboard to secondary pages and back.
*   **Tier 3: Device Aesthetics & Safe-Area Layouts (Goal: 100% Pass)**
    *   Mobile bottom navigation bar includes bottom padding to respect device safe-area insets.
    *   Quick Log overlay includes bottom padding.
*   **Tier 4: Extreme Responsiveness & Layout Stability (Goal: 100% Pass)**
    *   Cumulative Layout Shift (CLS) on transitions is `< 0.1`.
    *   Scroll positions do not reset unexpectedly.
    *   Charts fit card bounds at viewports down to 320px.
    *   No X-Axis tick label collisions on the charts.
