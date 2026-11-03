import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    tsconfigPath: process.env.NODE_ENV === "production" ? "tsconfig.build.json" : "tsconfig.json",
  },
  // Turbopack is incompatible with next-pwa currently
  // Fallback to Webpack
  webpack: (config, { isServer }) => {
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // In Next.js 15+, turbopack can be customized directly.
  // We provide an empty config to silence the Next warning.
  // @ts-ignore - Ignore type error as next config type might not have been fully updated yet for v16
  turbopack: {}
};

const config = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "1",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "supabase-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
  ],
})(nextConfig as any);

export default config;
