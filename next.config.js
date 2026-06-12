/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
  },
};

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
});

module.exports = withPWA(nextConfig);
