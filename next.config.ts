import type { NextConfig } from "next";

// S3/R2 kullanılıyorsa görsellerin genel adresi derleme anında bilinmeli (Docker: build-arg S3_PUBLIC_URL)
const s3 = (process.env.S3_PUBLIC_URL || "").replace(/\/$/, "");
let s3Pattern: { protocol: "https" | "http"; hostname: string; pathname: string } | null = null;
try {
  if (s3) {
    const u = new URL(s3);
    s3Pattern = { protocol: u.protocol === "http:" ? "http" : "https", hostname: u.hostname, pathname: `${u.pathname.replace(/\/$/, "")}/**` };
  }
} catch {}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_IMG_REMOTE: s3 },
  // iyzipay kaynaklarını çalışma anında dosya sisteminden yükler; paketlenmemeli.
  serverExternalPackages: ["iyzipay", "sharp"],
  images: {
    // Ürün görselleri ekran boyutuna göre küçültülüp WebP sunulur (src/lib/img.ts). Adresler değişmez (hash'li), uzun önbellek güvenli.
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [640, 828, 1080, 1600, 1920],
    remotePatterns: s3Pattern ? [s3Pattern] : [],
    localPatterns: [{ pathname: "/media/**", search: "" }, { pathname: "/demo/**", search: "" }],
  },
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  poweredByHeader: false,
  // Geliştirme modunda sol alttaki Next.js göstergesini gizle (canlıda zaten çıkmaz)
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://www.paytr.com\")" },
          // Temel CSP: başka sitede çerçevelenme (clickjacking), eklenti nesneleri ve <base> ile adres kaçırma engellenir
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" + ((process.env.APP_URL ?? "").startsWith("https://") ? "; upgrade-insecure-requests" : "") },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
        ],
      },
      { source: "/:file(demo|brand)/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=2592000" }] },
      { source: "/fonts/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
    ];
  },
};

export default nextConfig;
