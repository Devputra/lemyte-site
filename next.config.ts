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
  // Baseline security headers on every response. No full Content-Security-Policy yet (Razorpay, Vercel
  // analytics and inline JSON-LD would all need allow-listing); frame-ancestors alone blocks clickjacking.
  // Embedding Razorpay's checkout inside our pages is unaffected: these rules stop other sites framing us.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;