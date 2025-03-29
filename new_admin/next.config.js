/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure ESLint to suppress warnings and errors during build
  eslint: {
    // Don't run ESLint during build (set to true to enable)
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig 