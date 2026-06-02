import * as Sentry from "@sentry/nextjs";

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  enableLogs: !isDev,
  tracesSampleRate: isDev ? 1.0 : 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: isDev ? 0 : 0.1,
  integrations: isDev
    ? []
    : [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
        }),
      ],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
