# SteadyCut

A private personal weight-loss consistency app built with Next.js App Router,
TypeScript, Tailwind CSS, shadcn/ui, Clerk, Convex, Recharts, React Hook Form,
Zod, lucide-react, and the Vercel AI SDK Google provider.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In local development, `/dashboard` runs in preview mode with local demo data so
the interface can be checked immediately, even before the live services are
ready.

## Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CONVEX_URL=
CLERK_JWT_ISSUER_DOMAIN=
GOOGLE_GENERATIVE_AI_API_KEY=
STEADYCUT_LIVE_MODE=
```

Set `STEADYCUT_LIVE_MODE=true` in `.env.local` when Clerk, Convex, and Gemini
are all ready and you want local routes to require live authentication.

## Clerk + Convex Setup

1. Create or open a Clerk application.
2. Copy the Clerk publishable and secret keys into `.env.local`.
3. In Clerk, enable the Convex integration.
4. Copy the Clerk Frontend API URL into `CLERK_JWT_ISSUER_DOMAIN`.
5. Run `npx convex dev` and follow the login/project prompts.
6. Copy the generated Convex URL into `NEXT_PUBLIC_CONVEX_URL`.
7. Run the app with `npm run dev`.

The checked-in `convex/_generated` files are local shims because this workspace
is not linked to a Convex deployment yet. Running `npx convex dev` after linking
will regenerate the official Convex files.

## Gemini Setup

Add a Gemini API key from Google AI Studio as:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

The coach action uses `gemini-2.5-flash` and includes guardrails to keep output
motivational and behavioral rather than medical advice.

## Web Push Reminders

Generate VAPID keys without committing them:

```bash
npx web-push generate-vapid-keys
```

Add the public/private pair to Vercel and `.env.local` as `VAPID_PUBLIC_KEY`
and `VAPID_PRIVATE_KEY`.

## Deploying to Production

In Vercel, swap local/development values for production values:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CONVEX_URL=
CONVEX_DEPLOY_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

In the Clerk dashboard, use the production Clerk instance and set the
application display name to `SteadyCut`. The deployed sign-in page should not
show Clerk's development mode banner.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
