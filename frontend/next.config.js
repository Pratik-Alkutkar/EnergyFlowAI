/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy /api/* → backend during local development
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
