// Next.js instrumentation hook. Sentry is initialised here only when SENTRY_DSN
// is set, so without a key nothing loads and the build/runtime is unchanged.

export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    });
  }
}

// Captures errors thrown in server components / route handlers.
export async function onRequestError(...args: unknown[]) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  // @ts-expect-error — pass through Next's onRequestError args to Sentry.
  Sentry.captureRequestError(...args);
}
