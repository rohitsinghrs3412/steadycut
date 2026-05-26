<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project uses Next.js 16.2.6 with App Router and React 19. APIs,
conventions, and file structure may differ from older Next.js versions or
model training data. Before changing Next.js routing, rendering, metadata,
proxy, server/client component boundaries, caching, or config, read the
relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Operating Guide

Read `ARCHITECTURE.md` before making non-trivial changes. It is the project map
for routes, features, Convex data, auth, AI, and PWA behavior.

## Commands

Use these checks before handing off code changes when relevant:

```bash
npm run lint
npm run typecheck
npm run build
```

Run `npm run convex:codegen` only when Convex API/type generation is needed.
Do not manually edit files under `convex/_generated/`.

## Structure

- Keep `src/app/**/page.tsx` route files thin. Route files should choose demo
  or live mode, gather server-safe config, and render feature components.
- Put reusable product logic in `src/lib/steadycut.ts` or a focused
  `src/features/**` module instead of duplicating it inside large components.
- Put shared UI metadata, options, and display mappings in small modules near
  the SteadyCut components.
- Keep Convex public queries/mutations/actions in `convex/*.ts`, and move
  prompts, validators, fallback tables, and pure helpers into focused modules
  under `convex/ai/` or `convex/lib/`.
- Do not import server-only code into `"use client"` files. If in doubt, keep
  browser code in client components and Convex/server code in Convex modules.

## Product Modes

The app supports demo and live modes. Demo mode should keep the UI usable
without Clerk, Convex, Gemini, or push notification setup. Live mode should use
Clerk identity, Convex data, and real AI/photo flows.

When changing a workflow, check both paths or document why one path is not
affected.

## AI and Health Boundaries

Meal and coach AI output should stay motivational, behavioral, and explicitly
non-medical. Avoid shame, diagnosis, prescription, or certainty beyond the
available data. Prompt changes should preserve cautious estimates, concrete
assumptions, and one useful follow-up question at most.

## Verification

For UI work, run the local app and verify the changed screen in a browser when
the route is obvious. For logic-only work, prefer focused TypeScript checks and
unit-style extraction over broad rewrites.
