import * as Sentry from "@sentry/nextjs";

// Observability is gated on SENTRY_DSN: with no DSN this is a pure console.error
// shim, so dev/tests/CI and the build are unchanged until a key is configured.
const DSN = process.env.SENTRY_DSN;

export const isObservabilityConfigured = () => !!DSN;

// Tag every captured error so Sentry alert rules can target the money path
// (e.g. alert when area = payment | webhook | email).
export type ErrorArea = "payment" | "webhook" | "email" | "auth" | "general";

export function captureError(
  err: unknown,
  ctx: { area: ErrorArea; message?: string; extra?: Record<string, unknown> }
): void {
  const { area, message, extra } = ctx;
  console.error(`[${area}]${message ? " " + message : ""}`, err);
  if (!DSN) return;
  try {
    Sentry.captureException(err, { tags: { area }, extra: { ...(message ? { message } : {}), ...extra } });
  } catch {
    // Telemetry must never break the request path.
  }
}
