"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getLocale } from "@/lib/i18n/server";
import { brands, products } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { cardQuery, type ProductCard } from "@/lib/store";

export type Answers = { amac: string; seviye: string; butce: string; toprak: string; agirlik: string; su: string };
export type Pick = { p: ProductCard; why: string[]; caveat: string | null; label: string };

const BUDGET: Record<string, [number, number]> = { "0-25": [0, 25000], "25-60": [25000, 60000], "60-150": [60000, 150000], "150+": [150000, 10_000_000] };

export type Result = { picks: Pick[]; total: number; brand: string | null; only: boolean };

export async function recommend(a: Answers): Promise<Result> {
  const rows = await db.query.products.findMany({ where: eq(products.status, "ACTIVE") });
  // Öncelikli marka (Vitrin ayarı): priority → uyanlar hep üstte; only → yalnız o marka; all → tarafsız
  const { merch } = await getSettings();
  const mode = merch.focusBrand ? (merch.wizard ?? "priority") : "all";
  const focus = mode === "all" ? null : await db.query.brands.findFirst({ where: eq(brands.slug, merch.focusBrand) });
  const isFocus = (brandId: string | null) => !!focus && brandId === focus.id;
  const cards = await cardQuery().where(eq(products.status, "ACTIVE"));
  const [lo, hi] = BUDGET[a.butce] ?? [0, 10_000_000];
  const en = (await getLocale()) === "en";
  const L = (tr: string, eng: string) => (en ? eng : tr);
  const scored = rows
    .filter((p) => !p.useCases.includes("pointer") || a.amac === "pointer")
    .filter((p) => a.amac === "pointer" || !(p.useCases.length === 0))
    .map((p) => {
      let score = 0;
      const why: string[] = [];
      let caveat: string | null = null;
      if (p.useCases.includes(a.amac)) {
        score += 40;
        why.push(
          a.amac === "sahil"
            ? L("Islak kum ve tuzlu suda kararlı çalışacak şekilde tasarlandı", "Designed to run stable on wet sand and in salt water")
            : a.amac === "altin"
              ? L("Küçük doğal altına hassas", "Sensitive to small natural gold")
              : a.amac === "derin"
                ? L("Büyük ve derin hedefler için güçlü", "Powerful on large, deep targets")
                : a.amac === "pointer"
                  ? L("Kazıda hedefi hızla bulmanı sağlar", "Finds the target fast while you dig")
                  : L("Sikke ve takıda iyi ayrım yapar", "Good discrimination on coins and jewelry"),
        );
      } else score -= 30;
      if (p.price >= lo && p.price <= hi) score += 25;
      else if (p.price < lo) score += 10;
      else if (p.price <= hi * 1.15) {
        score += 5;
        caveat = L("Bütçenin biraz üstünde.", "Slightly above your budget.");
      } else score -= 40;
      if (a.seviye && p.experience === a.seviye) {
        score += 15;
        if (a.seviye === "BEGINNER") why.push(L("Hazır modlarıyla ilk cihaz için rahat", "Preset modes make it easy as a first detector"));
      } else if (a.seviye === "BEGINNER" && p.experience === "PRO") {
        score -= 10;
        caveat ??= L("Menüsü ilk cihaz için yoğun olabilir.", "The menu can feel busy for a first detector.");
      }
      if (a.toprak === "demirli" || a.toprak === "sahil") {
        if (p.technology === "MULTI" || p.technology === "PI") {
          score += 12;
          why.push(p.technology === "PI" ? L("PI teknolojisi mineralli zeminden az etkilenir", "PI technology is barely affected by mineralized ground") : L("Çok frekanslı yapısı zor zeminde sakin çalışır", "Multi-frequency keeps it quiet on difficult ground"));
        } else if (p.technology === "VLF") {
          score -= 6;
          caveat ??= L("Tek frekanslı; çok mineralli zeminde ayar gerektirir.", "Single frequency; needs tuning on highly mineralized ground.");
        }
      }
      if (a.su === "dalis") {
        if (p.waterproof === "FULL") {
          score += 15;
          why.push(L("Tamamen su geçirmez", "Fully waterproof"));
        } else {
          score -= 25;
          caveat = L("Gövdesi su altına girmez.", "The control box can't go underwater.");
        }
      } else if (a.su === "kiyi" && p.waterproof && p.waterproof !== "NONE") score += 5;
      if (a.agirlik === "onemli" && p.weightKg) {
        if (p.weightKg <= 1.4) {
          score += 8;
          why.push(en ? `${p.weightKg.toLocaleString("en-US")} kg, easy to carry all day` : `${p.weightKg.toLocaleString("tr-TR")} kg, gün boyu taşınır`);
        } else score -= 5;
      }
      if (p.stock > 0) score += 4;
      return { id: p.id, score, why, caveat, price: p.price, focus: isFocus(p.brandId) };
    })
    // Önce uygunluk eşiği (öncelik, uymayan cihazı öneriye sokmaz); sonra öncelikli marka sıralamada öne geçer
    .filter((x) => x.score > 20 && (mode !== "only" || x.focus))
    .sort((x, y) => (mode === "priority" ? Number(y.focus) - Number(x.focus) : 0) || y.score - x.score);
  const top = scored.slice(0, 3);
  const cheaper = scored.filter((x) => top[0] && x.price < top[0].price && !top.slice(0, 1).some((t) => t.id === x.id))[0];
  const ordered = top.length >= 2 && cheaper && !top.some((t) => t.id === cheaper.id) ? [top[0], cheaper, top[1]] : top;
  const labels = en ? ["BEST MATCH", "BETTER PRICE", "ALTERNATIVE"] : ["EN UYGUN", "DAHA UYGUN FİYATLI", "ALTERNATİF"];
  const enNames = en ? new Map(cards.map((c) => [c.id, c.nameEn])) : null;
  return {
    brand: focus?.name ?? null,
    only: mode === "only" && !!focus,
    total: scored.length,
    picks: ordered.map((x, i) => ({
      p: ((c) => ({ ...c, name: enNames?.get(c.id) || c.name }))(cards.find((c) => c.id === x.id)!),
      why: x.why.length ? x.why.slice(0, 3) : [L("Seçimlerine genel olarak uygun", "A good overall fit for your choices")],
      caveat: x.caveat,
      label: i === 1 && cheaper && x.id === cheaper.id ? labels[1] : i === 0 ? labels[0] : labels[2],
    })),
  };
}
