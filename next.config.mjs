/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Allows production builds to succeed while completing full migration
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
