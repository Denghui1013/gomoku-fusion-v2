import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isStaticExport = process.env.NEXT_OUTPUT_MODE === "export";
const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  ...(isStaticExport ? { output: "export" as const } : {}),
  outputFileTracingRoot: configDir,
  turbopack: {},
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  webpack: (config, { isServer, dev }) => {
    // Keep Next.js default chunking in development to avoid stale vendor chunk issues.
    if (!isServer && !dev) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          ai: {
            test: /[\\/]src[\\/]lib[\\/](advancedGomokuAi|optimizedGomokuAi|gomokuAi)[\\/]/,
            name: "ai-algorithms",
            priority: 10,
            reuseExistingChunk: true,
          },
          animations: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: "animations",
            priority: 10,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withAnalyzer(nextConfig);
