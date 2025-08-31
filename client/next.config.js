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
  // Configure server to always run on port 3001
  server: {
    port: 3001,
  },
};

module.exports = nextConfig;
