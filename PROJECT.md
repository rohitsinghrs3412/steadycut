# Project: SteadyCut Optimization

## Architecture
SteadyCut is a Next.js App Router project running with a Convex backend and Clerk auth.
The core product UI is located in `src/components/steadycut/`.
Key UI files to modify:
- `src/components/steadycut/dashboard-screen.tsx`: Central dashboard containing mobile tabs ("Summary", "Check-in", "Trends") and layout.
- `src/components/steadycut/mobile-bottom-nav.tsx`: Bottom navigation bar that needs safe area padding.
- `src/components/steadycut/photo-logging-workspace.tsx` or similar logging components.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | E2E_TEST | E2E Testing Track: Implement E2E test suite (Tiers 1-4), write `TEST_INFRA.md` and `TEST_READY.md`. | None | DONE |
| 2 | IMPL_EXPLORE | Explore codebase for mobile UI/UX and performance bottlenecks. | None | DONE |
| 3 | IMPL_UI_UX | Implement mobile UI/UX improvements (tabs transitions, safe-area bottom padding, responsive charts). | IMPL_EXPLORE | DONE |
| 4 | IMPL_PERF | Optimize rendering performance, dynamic imports, minimize re-renders, prevent CLS. | IMPL_UI_UX | DONE |
| 5 | IMPL_VERIFY | Verify build, lint, typecheck, pass unit tests, E2E tests, and perform Tier 5 Adversarial Coverage Hardening. | IMPL_PERF, E2E_TEST | IN_PROGRESS (Reviewers, Challengers, Auditor running) |
| 6 | IMPL_DEPLOY | Deploy to Vercel production and verify live URL. | IMPL_VERIFY | PLANNED |

## Interface Contracts
- Mobile tabs component coordinates active tab selection state with routing or React state to avoid layouts shifts.
- Responsive charts must scale with CSS/parent containers down to 320px viewport.
- Bottom safe area is handled via `padding-bottom: env(safe-area-inset-bottom)` or Tailwind equivalent utilities.

## Code Layout
- Frontend components: `src/components/steadycut/`
- App Router layout & pages: `src/app/`
- Shared domain code & utilities: `src/lib/`
- Test files: `src/**/*.test.ts` or `src/**/*.test.tsx`
- Backend / Convex files: `convex/`
