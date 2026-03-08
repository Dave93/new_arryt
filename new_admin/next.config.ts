import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tabler/icons-react",
      "date-fns",
      "lodash",
    ],
  },
};

export default nextConfig;
