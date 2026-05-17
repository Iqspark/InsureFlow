/** @type {import('next').NextConfig} */
const withPWA = require("@ducanh2912/next-pwa").default;

const nextConfig = {
  // "standalone" bundles only the files needed to run the server.
  // GitHub Actions copies .next/standalone + .next/static + public
  // into one deployment package — no npm install needed on Azure.
  output: "standalone",

  // Keep Node.js-only packages out of the client/edge bundles.
  // pdfjs-dist must be listed too — pdf-parse uses it internally and its .mjs
  // file breaks webpack's module system if bundled.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js built-ins from being bundled for the browser.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig);
