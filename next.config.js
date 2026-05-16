/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" bundles only the files needed to run the server.
  // GitHub Actions copies .next/standalone + .next/static + public
  // into one deployment package — no npm install needed on Azure.
  output: "standalone",
};

module.exports = nextConfig;
