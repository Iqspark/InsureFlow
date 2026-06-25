import type { NextRequest } from "next/server";

// Resolves the PUBLIC base URL for links emailed to users (payment / policy).
//
// In a containerized deploy (Azure App Service, Docker), `req.nextUrl.origin`
// is the container's internal bind (e.g. http://46f76c6893a4:8080) over http
// (TLS is terminated upstream), which is not reachable by recipients.
//
// Order: an explicit, non-localhost NEXTAUTH_URL wins (deterministic + safe
// against host-header spoofing). Otherwise — NEXTAUTH_URL unset or accidentally
// localhost on a cloud deploy — derive the public origin from the proxy headers:
// host from x-forwarded-host or the preserved Host header (Azure forwards the
// original Host), scheme from x-forwarded-proto.
// Host headers are client-influenceable, so a header-derived origin (used only
// when NEXTAUTH_URL is unset/localhost) is accepted only if it is allowlisted.
// When PUBLIC_HOST_ALLOWLIST is unset we preserve legacy behavior — production
// MUST set a non-localhost NEXTAUTH_URL, which short-circuits the header path
// entirely (see below) and is the primary defense against host-header spoofing.
function isAllowedHost(host: string): boolean {
  const allow = process.env.PUBLIC_HOST_ALLOWLIST
    ?.split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (!allow || allow.length === 0) return true;
  return allow.includes(host.toLowerCase());
}

export function publicBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  const isLocal = (h?: string | null) => !h || /(localhost|127\.0\.0\.1)/i.test(h);

  if (configured && !isLocal(configured)) return configured;

  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = fwdHost || req.headers.get("host")?.trim();
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "");
  if (host && !isLocal(host) && isAllowedHost(host)) return `${proto}://${host}`;

  return configured || req.nextUrl.origin;
}
