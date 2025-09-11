/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    dirs: ['app'],
  },
  images: {
    formats: ['image/webp'],
  },
};

module.exports = nextConfig;
