/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {},
  reactStrictMode: true,
  swcMinify: true,
  experimental: {},
  eslint: {
    dirs: ['app'],
  },
  images: {
    domains: ['static.wixstatic.com'],
    formats: ['image/webp'],
  },
  // Note: To set a custom port, use environment variable PORT=3001
  // or modify the package.json scripts to include --port 3001
};

module.exports = nextConfig;
