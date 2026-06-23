import type { NextRequest } from "next/server";

// Resolves the PUBLIC base URL for links emailed to users (payment / policy).
//
// In a containerized deploy (Azure App Service, Docker), `req.nextUrl.origin`
// is the container's internal bind (e.g. http://46f76c6893a4:8080), which is
// not reachable by recipients.
//
// Order: an explicit, non-localhost NEXTAUTH_URL wins (safe against host-header
// spoofing). Otherwise — i.e. NEXTAUTH_URL is unset or accidentally localhost on
// a cloud deploy — use the proxy's forwarded host, then any configured value,
// then the request origin.
export function publicBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  const isLocal = (u?: string) => !u || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(u);

  if (configured && !isLocal(configured)) return configured;

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (proto && host) return `${proto}://${host}`;

  if (configured) return configured;
  return req.nextUrl.origin;
}
