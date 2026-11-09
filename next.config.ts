import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay kaynaklarını çalışma anında dosya sisteminden yükler; paketlenmemeli.
  serverExternalPackages: ["iyzipay"],
  images: { unoptimized: true },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
