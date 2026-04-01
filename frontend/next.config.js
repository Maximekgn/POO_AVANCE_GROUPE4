/** @type {import('next').NextConfig} */
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const backendBaseUrl = apiUrl.replace(/\/api\/?$/, "");

const nextConfig = {
  distDir: ".next_cache",
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "a0.muscache.com",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10000mb",
    },
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${backendBaseUrl}/media/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
