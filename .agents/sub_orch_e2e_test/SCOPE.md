# Scope: E2E Test Suite Creation

## Architecture
- SteadyCut is a Next.js App Router application with Convex backend and Clerk auth.
- Core UI screens: Dashboard (Summary, Check-in, Trends), Coach page (meal & camera log), and Sidebar Navigation.
- E2E testing will be opaque-box, exercise pages through simulated testing environment using Vitest.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Setup Infra | Setup Playwright config for E2E tests and configure browsers. | None | DONE |
| 2 | Tier 1 Tests | Implement Feature Coverage tests (Dashboard tabs, nav menu, quick log form). | Setup Infra | DONE |
| 3 | Tier 2 Tests | Implement Boundary & Edge Cases (safe-area padding presence, responsiveness checks, empty states). | Tier 1 Tests | DONE |
| 4 | Tier 3 Tests | Implement Cross-feature combination tests (tab transition flow, entry -> dashboard update). | Tier 2 Tests | DONE |
| 5 | Tier 4 Tests | Implement Real-world application scenarios. | Tier 3 Tests | DONE |
| 6 | Publish Docs | Verify tests run, write TEST_INFRA.md and TEST_READY.md. | Tier 4 Tests | DONE |

## Interface Contracts
- Tests must be executed using Playwright.
- Opaque-box tests must verify elements, layout parameters, viewport responsiveness, and transition correctness without depending on internal component implementations.
