import type { NextRequest } from "next/server";

// Resolves the PUBLIC base URL for links emailed to users (payment / policy).
//
// In a containerized deploy (Azure App Service, Docker), `req.nextUrl.origin`
// is the container's internal bind (e.g. http://46f76c6893a4:8080), which is
// not reachable by recipients. Prefer the configured public URL, then the
// proxy's forwarded headers, and only fall back to the request origin.
export function publicBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXTAUTH_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (proto && host) return `${proto}://${host}`;

  return req.nextUrl.origin;
}
