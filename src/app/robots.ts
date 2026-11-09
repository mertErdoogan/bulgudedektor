import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

const PRIVATE = ["/admin", "/api/", "/hesabim", "/odeme", "/sepet", "/siparis", "/giris", "/kayit", "/karsilastir", "/*?*sirala=", "/ara?"];

// AI arama motorlarının botları: açıkça izin veriyoruz ki ChatGPT Search, Perplexity, Claude,
// Google AI Overviews / Gemini ve Apple Intelligence siteyi okuyup kaynak gösterebilsin.
const AI_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "YandexBot",
  "DuckAssistBot",
  "meta-externalagent",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: ["/", "/llms.txt", "/llms-full.txt"], disallow: PRIVATE },
    ],
    sitemap: [`${base}/sitemap.xml`],
    host: base,
  };
}
