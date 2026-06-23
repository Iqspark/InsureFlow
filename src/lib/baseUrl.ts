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
export function publicBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "");
  const isLocal = (h?: string | null) => !h || /(localhost|127\.0\.0\.1)/i.test(h);

  if (configured && !isLocal(configured)) return configured;

  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = fwdHost || req.headers.get("host")?.trim();
  const proto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    req.nextUrl.protocol.replace(":", "");
  if (host && !isLocal(host)) return `${proto}://${host}`;

  return configured || req.nextUrl.origin;
}
