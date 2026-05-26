import { notFound } from "next/navigation";

import { SentryExampleClient } from "./sentry-example-client";

export default function SentryExamplePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <SentryExampleClient />;
}
