/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental server actions (stable in 14.x but explicit is clearer)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Large PDF uploads for AI extraction
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
