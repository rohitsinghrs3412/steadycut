import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_SENTRY_DSN:
      process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "",
    NEXT_PUBLIC_SENTRY_ENVIRONMENT:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
      process.env.SENTRY_ENVIRONMENT ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
