import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ESLint still runs via `npm run lint` and in the editor —
    // this only stops ~150 pre-existing `no-explicit-any` errors
    // from blocking production builds. Remove once types are cleaned up.
    ignoreDuringBuilds: true,
  },
  // Share-card images (src/lib/og.tsx) read the icon at request time when a page is regenerated.
  outputFileTracingIncludes: { "/**": ["./src/app/icon.png"] },
};

export default nextConfig;