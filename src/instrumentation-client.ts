import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  enableLogs: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
