import type { NextConfig } from "next";
import { randomUUID } from "node:crypto";

const buildId = process.env.BUILD_ID || process.env.NEXT_PUBLIC_BUILD_ID || (process.env.NODE_ENV === "production" ? randomUUID() : "dev");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  generateBuildId: () => buildId,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "app.hyperliquid.xyz", pathname: "/coins/**" },
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "*.e2b.app", "*.arena.site"],
  experimental: { staleTimes: { dynamic: 0, static: 30 } },
  async redirects() {
    return [
      { source: "/pro", destination: "/trade", permanent: true },
      { source: "/terminal", destination: "/trade", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }, {
      // HTML/RSC must never be reused by a browser or preview proxy after a navigation change.
      source: "/((?!_next/static|_next/image|favicon.ico|images/).*)",
      headers: [
        { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        { key: "CDN-Cache-Control", value: "no-store" },
        { key: "Surrogate-Control", value: "no-store" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    }, { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] }];
  },
};
export default nextConfig;
