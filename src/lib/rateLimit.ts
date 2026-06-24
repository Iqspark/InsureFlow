// Lightweight in-memory fixed-window rate limiter for public endpoints.
//
// NOTE: state is per-process. On a single Azure App Service instance this is
// effective; across multiple instances each has its own window (so the true
// limit is limit × instances). For strict global limits use a shared store
// (Redis). This is a pragmatic abuse/DoS guard, not billing-grade.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow unbounded.
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (now >= b.resetAt) buckets.delete(k);
    });
  }

  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfterSec: 0 };
}

// Best-effort client IP from the proxy's forwarded header.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Returns a 429 Response when over limit, or null when allowed.
export function tooMany(
  key: string,
  limit: number,
  windowMs: number
): Response | null {
  const { ok, retryAfterSec } = rateLimit(key, limit, windowMs);
  if (ok) return null;
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again shortly." }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) } }
  );
}
