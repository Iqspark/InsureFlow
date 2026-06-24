/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
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
