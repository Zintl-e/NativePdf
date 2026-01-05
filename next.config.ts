import { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {}, // required to avoid Turbopack/Webpack conflict

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
