"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * Sipariş kaynağı (reklam ölçümü): ziyaretçi siteye bir reklam/kampanya bağlantısıyla geldiyse
 * utm_*, gclid, fbclid ve referrer bilgisini saklar; ödeme formu bunu siparişe ekler.
 *
 * - Her zaman sekme oturumu boyunca (sessionStorage) tutulur — kişisel veri değil, yalnızca "nereden geldi".
 * - Analitik çerez onayı varsa 30 gün localStorage'da da tutulur (dedektör gibi pahalı ürünlerde
 *   müşteri reklamı görüp birkaç gün sonra satın alır).
 * - Yeni bir kampanya bağlantısıyla gelinirse eskisinin üzerine yazılır (son tıklama).
 */
export const ATTR_KEY = "arena_attr";
const TTL = 30 * 86400_000;
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"] as const;

type Attr = Record<string, string>;

const cut = (v: string, n = 200) => v.slice(0, n);

function hasConsent() {
  return /(?:^|; )arena_consent=[^;]*a/.test(document.cookie);
}

export function readAttribution(): Attr | null {
  try {
    const s = sessionStorage.getItem(ATTR_KEY);
    if (s) return JSON.parse(s) as Attr;
    const l = localStorage.getItem(ATTR_KEY);
    if (l) {
      const v = JSON.parse(l) as Attr & { exp?: number };
      if (v.exp && v.exp > Date.now()) return v;
      localStorage.removeItem(ATTR_KEY);
    }
  } catch {}
  return null;
}

export function Attribution() {
  // WhatsApp / telefon / e-posta tıklamaları = iletişim dönüşümü (GA4 "contact", Meta "Contact").
  // GA4'te "contact" olayı Google Ads'e dönüşüm olarak içe aktarılabilir.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const h = a.getAttribute("href") ?? "";
      const method = /wa\.me|whatsapp/i.test(h) ? "whatsapp" : h.startsWith("tel:") ? "phone" : h.startsWith("mailto:") ? "email" : "";
      if (method) track("contact", { method, page: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const found: Attr = {};
      for (const p of PARAMS) {
        const v = u.searchParams.get(p);
        if (v) found[p.replace("utm_", "")] = cut(v);
      }
      let ref = "";
      try {
        if (document.referrer) {
          const r = new URL(document.referrer);
          if (r.host !== u.host) ref = r.host;
        }
      } catch {}
      const isCampaign = Object.keys(found).length > 0;
      const existing = readAttribution();
      // Kampanya bağlantısı yoksa: ilk dış referrer'ı (google.com, instagram.com…) kaydet, mevcut kaydı ezme
      if (!isCampaign && (existing || !ref)) {
        if (existing && hasConsent() && !localStorage.getItem(ATTR_KEY)) localStorage.setItem(ATTR_KEY, JSON.stringify({ ...existing, exp: Date.now() + TTL }));
        return;
      }
      const attr: Attr = { ...found, ...(ref ? { referrer: ref } : {}), landing: cut(u.pathname, 120), at: new Date().toISOString() };
      if (!attr.source) {
        if (attr.gclid || attr.gbraid || attr.wbraid) Object.assign(attr, { source: "google", medium: "cpc" });
        else if (attr.fbclid) Object.assign(attr, { source: "facebook", medium: "paid_social" });
        else if (ref) Object.assign(attr, { source: ref.replace(/^www\./, ""), medium: /google|bing|yandex|duckduckgo/.test(ref) ? "organic" : "referral" });
      }
      sessionStorage.setItem(ATTR_KEY, JSON.stringify(attr));
      if (hasConsent()) localStorage.setItem(ATTR_KEY, JSON.stringify({ ...attr, exp: Date.now() + TTL }));
    } catch {}
  }, []);
  return null;
}
