import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/my-1-plan",
        destination: "/financial-goals",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
