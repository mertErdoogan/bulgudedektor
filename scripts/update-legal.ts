/**
 * Yasal sayfaları (sözleşmeler, KVKK, iade, ödeme/teslimat, hakkımızda) yükler.
 *   npm run db:legal            # olmayanları ekler, "örnek" metinleri değiştirir; panelde düzenlenmiş metinlere dokunmaz
 *   npm run db:legal -- --force # hepsinin üzerine yazar
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { pages } from "../src/db/schema";
import { LEGAL_PAGES } from "./lib/legal-texts";

(async () => {
  const force = process.argv.includes("--force");
  let added = 0;
  let replaced = 0;
  for (const p of LEGAL_PAGES) {
    const cur = await db.query.pages.findFirst({ where: eq(pages.slug, p.slug) });
    if (!cur) {
      await db.insert(pages).values(p);
      added++;
    } else if (force || cur.content.includes("Bu metin örnektir") || cur.content.includes("[ŞİRKET UNVANI]")) {
      await db.update(pages).set({ title: p.title, content: p.content, seoDescription: p.seoDescription ?? cur.seoDescription, updatedAt: new Date() }).where(eq(pages.id, cur.id));
      replaced++;
    }
  }
  console.log(`✓ ${added} sayfa eklendi, ${replaced} sayfa güncellendi.`);
  process.exit(0);
})();
