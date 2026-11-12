import "server-only";
import { cookies, headers } from "next/headers";
import type { OrderAttribution } from "@/db/schema";

const KEYS = ["source", "medium", "campaign", "term", "content", "gclid", "gbraid", "wbraid", "fbclid", "referrer", "landing", "at"] as const;

/** Ödeme formundan gelen kaynak bilgisini (istemci verisi, güvenilmez) temizler; onay ve Meta çerezlerini ekler. */
export async function readOrderAttribution(raw: FormDataEntryValue | null): Promise<OrderAttribution | null> {
  const out: OrderAttribution = {};
  if (typeof raw === "string" && raw.length < 4000) {
    try {
      const v = JSON.parse(raw) as Record<string, unknown>;
      for (const k of KEYS) if (typeof v[k] === "string" && v[k]) out[k] = (v[k] as string).replace(/[\u0000-\u001f<>]/g, "").slice(0, 200);
    } catch {}
  }
  const c = await cookies();
  const consent = c.get("arena_consent")?.value ?? "";
  out.analytics = consent.includes("a");
  out.marketing = consent.includes("m");
  if (out.marketing) {
    // Meta Conversions API eşleştirmesi için (yalnızca pazarlama onayı varsa saklanır)
    const fbp = c.get("_fbp")?.value;
    const fbc = c.get("_fbc")?.value ?? (out.fbclid ? `fb.1.${Date.parse(out.at ?? "") || Date.now()}.${out.fbclid}` : undefined);
    if (fbp) out.fbp = fbp.slice(0, 120);
    if (fbc) out.fbc = fbc.slice(0, 300);
    const h = await headers();
    out.ip = h.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || undefined;
    out.ua = h.get("user-agent")?.slice(0, 300) || undefined;
  }
  return out;
}

/** Panelde gösterim: "Google Ads", "Instagram", "Doğrudan" … */
export function sourceLabel(a: OrderAttribution | null | undefined, channel?: string | null): string {
  if (channel && channel !== "WEB") return channel === "TRENDYOL" ? "Trendyol" : channel === "HEPSIBURADA" ? "Hepsiburada" : channel;
  if (!a) return "Bilinmiyor";
  if (a.gclid || a.gbraid || a.wbraid) return "Google Ads";
  if (a.fbclid || /facebook|instagram|meta/i.test(a.source ?? "")) return a.medium === "paid_social" || a.fbclid ? "Meta reklam" : "Instagram/Facebook";
  if (a.source) {
    const s = a.source.replace(/^www\./, "");
    if (a.medium === "organic") return s.includes("google") ? "Google (organik)" : `${s} (organik)`;
    if (a.medium === "email") return "E-posta";
    return a.campaign ? `${s} · ${a.campaign}` : s;
  }
  return "Doğrudan";
}
