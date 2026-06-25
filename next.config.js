/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
  // Security response headers. Applied by the Next.js server at runtime, so they
  // work on the Azure standalone deploy (unlike vercel.json, which Azure ignores).
  // Referrer-Policy: no-referrer ensures the secret token in /pay/<token> and
  // /portal/<token> URLs never leaks to a third party (e.g. the Google Maps iframe).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
        ],
      },
    ];
  },
  // PWA (next-pwa) injects a webpack config; production build runs with
  // --webpack. In dev, PWA is disabled, so an empty turbopack config lets
  // `next dev` run on Turbopack without the webpack/turbopack conflict error.
  turbopack: {},
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA(nextConfig);
