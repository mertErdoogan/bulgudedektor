"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { cardQuery, type ProductCard } from "@/lib/store";

export type Answers = { amac: string; seviye: string; butce: string; toprak: string; agirlik: string; su: string };
export type Pick = { p: ProductCard; why: string[]; caveat: string | null; label: string };

const BUDGET: Record<string, [number, number]> = { "0-25": [0, 25000], "25-60": [25000, 60000], "60-150": [60000, 150000], "150+": [150000, 10_000_000] };

export async function recommend(a: Answers): Promise<{ picks: Pick[]; total: number }> {
  const rows = await db.query.products.findMany({ where: eq(products.status, "ACTIVE") });
  const cards = await cardQuery().where(eq(products.status, "ACTIVE"));
  const [lo, hi] = BUDGET[a.butce] ?? [0, 10_000_000];
  const scored = rows
    .filter((p) => !p.useCases.includes("pointer") || a.amac === "pointer")
    .filter((p) => a.amac === "pointer" || !(p.useCases.length === 0))
    .map((p) => {
      let score = 0;
      const why: string[] = [];
      let caveat: string | null = null;
      if (p.useCases.includes(a.amac)) {
        score += 40;
        why.push(a.amac === "sahil" ? "Islak kum ve tuzlu suda kararlı çalışacak şekilde tasarlandı" : a.amac === "altin" ? "Küçük doğal altına hassas" : a.amac === "derin" ? "Büyük ve derin hedefler için güçlü" : a.amac === "pointer" ? "Kazıda hedefi hızla bulmanı sağlar" : "Sikke ve takıda iyi ayrım yapar");
      } else score -= 30;
      if (p.price >= lo && p.price <= hi) score += 25;
      else if (p.price < lo) score += 10;
      else if (p.price <= hi * 1.15) {
        score += 5;
        caveat = "Bütçenin biraz üstünde.";
      } else score -= 40;
      if (a.seviye && p.experience === a.seviye) {
        score += 15;
        if (a.seviye === "BEGINNER") why.push("Hazır modlarıyla ilk cihaz için rahat");
      } else if (a.seviye === "BEGINNER" && p.experience === "PRO") {
        score -= 10;
        caveat ??= "Menüsü ilk cihaz için yoğun olabilir.";
      }
      if (a.toprak === "demirli" || a.toprak === "sahil") {
        if (p.technology === "MULTI" || p.technology === "PI") {
          score += 12;
          why.push(p.technology === "PI" ? "PI teknolojisi mineralli zeminden az etkilenir" : "Çok frekanslı yapısı zor zeminde sakin çalışır");
        } else if (p.technology === "VLF") {
          score -= 6;
          caveat ??= "Tek frekanslı; çok mineralli zeminde ayar gerektirir.";
        }
      }
      if (a.su === "dalis") {
        if (p.waterproof === "FULL") {
          score += 15;
          why.push("Tamamen su geçirmez");
        } else {
          score -= 25;
          caveat = "Gövdesi su altına girmez.";
        }
      } else if (a.su === "kiyi" && p.waterproof && p.waterproof !== "NONE") score += 5;
      if (a.agirlik === "onemli" && p.weightKg) {
        if (p.weightKg <= 1.4) {
          score += 8;
          why.push(`${p.weightKg.toLocaleString("tr-TR")} kg, gün boyu taşınır`);
        } else score -= 5;
      }
      if (p.stock > 0) score += 4;
      return { id: p.id, score, why, caveat, price: p.price };
    })
    .filter((x) => x.score > 20)
    .sort((x, y) => y.score - x.score);
  const top = scored.slice(0, 3);
  const cheaper = scored.filter((x) => top[0] && x.price < top[0].price && !top.slice(0, 1).some((t) => t.id === x.id))[0];
  const ordered = top.length >= 2 && cheaper && !top.some((t) => t.id === cheaper.id) ? [top[0], cheaper, top[1]] : top;
  const labels = ["EN UYGUN", "DAHA UYGUN FİYATLI", "ALTERNATİF"];
  return {
    total: scored.length,
    picks: ordered.map((x, i) => ({
      p: cards.find((c) => c.id === x.id)!,
      why: x.why.length ? x.why.slice(0, 3) : ["Seçimlerine genel olarak uygun"],
      caveat: x.caveat,
      label: i === 1 && cheaper && x.id === cheaper.id ? labels[1] : i === 0 ? labels[0] : labels[2],
    })),
  };
}
