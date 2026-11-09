import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay kaynaklarını çalışma anında dosya sisteminden yükler; paketlenmemeli.
  serverExternalPackages: ["iyzipay", "sharp"],
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
      { source: "/:file(demo|brand)/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
    ];
  },
};

export default nextConfig;
