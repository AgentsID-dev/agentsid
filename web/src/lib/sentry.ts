import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.PROD ? "production" : "development",
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracePropagationTargets: ["localhost", /^https:\/\/agentsid\.dev\/api/],
    beforeSend(event) {
      // Don't send events in dev
      if (!import.meta.env.PROD) return null;
      return event;
    },
  });
}

export { Sentry };
