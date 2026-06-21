# Test Runner Readiness & Verification

This document provides instructions on executing the E2E tests and details the current test coverage and features verified by the suite.

---

## 1. Test Runner Command

Ensure your development server is built or is running, or let Playwright spawn it. Run the following command from the project root:

```bash
# Run all E2E tests using Playwright
npm run test:e2e
```

Or run via `npx` directly for specific filters:

```bash
# Run a specific spec file
npx playwright test e2e/dashboard-tabs.spec.ts

# Run with UI mode
npx playwright test --ui
```

---

## 2. Coverage Summary Table (Tiers 1-4)

The test coverage is organized into four tiers as outlined in `TEST_INFRA.md`:

| Tier | Tier Level | Target Focus | Test Count | Status / Expected Result |
|---|---|---|---|---|
| **Tier 1** | Critical Infrastructure | Authentication, page loading, layout shells | 1 | PASS |
| **Tier 2** | Core User Journeys | Tab swaps, navigation transitions, full path flow | 2 | PASS / FAIL (subject to scroll bugs) |
| **Tier 3** | Device Inset Padding | Safe-area padding on bottom bar and sheets | 2 | PASS / FAIL (subject to padding bugs) |
| **Tier 4** | Responsiveness & CLS | Scroll position, CLS < 0.1, responsive charts, no X-axis overlaps | 3 | PASS / FAIL (subject to chart bugs) |

---

## 3. Verified Feature Checklist

Use the checklist below to confirm which product requirements are covered by the current E2E test files:

- [x] **Dashboard Mobile Tabs Swap**: Tabs correctly swap active styling and view content (`e2e/dashboard-tabs.spec.ts`)
- [x] **Dashboard Tab Scroll Position**: Tab swapping preserves vertical page scroll position (`e2e/dashboard-tabs.spec.ts`)
- [x] **Tab Transition Cumulative Layout Shift (CLS)**: CLS is observed and asserted `< 0.1` (`e2e/dashboard-tabs.spec.ts`)
- [x] **Bottom Navigation Bar Insets**: Check for padding respecting the device's safe area (`e2e/safe-area.spec.ts`)
- [x] **Quick Log Insets & Overlap**: Quick Log sheet has bottom safe area padding and stays clear of system controls (`e2e/safe-area.spec.ts`)
- [x] **Chart Boundaries Sizing**: Weight Trend chart stays within Card limits down to 320px viewport width (`e2e/charts-responsiveness.spec.ts`)
- [x] **Chart Label Collision Protection**: X-Axis tick labels on the chart do not collide/overlap (`e2e/charts-responsiveness.spec.ts`)
- [x] **End-to-End Navigation Journey**: Flow from dashboard, tabs, quick log, progress page, and back (`e2e/real-world-scenarios.spec.ts`)
