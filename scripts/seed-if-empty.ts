/* Ön izleme ortamı açılışı: veritabanı boşsa (hiç ürün yoksa) demo veriyi yükler; doluysa hiçbir şeye dokunmaz.
   Böylece her güncellemede (deploy) veriler silinmez, yalnızca ilk kurulumda demo içerik gelir.
   SEED_DEMO=1 değilse hiçbir şey yapmaz. ADMIN_PASSWORD verilmişse demo hesapların şifresi onunla değiştirilir.
   DEMO_VERSION değişince (ör. mağaza adı/demo içerik yenilendiğinde) ön izlemedeki demo veri bir kez baştan yüklenir. */
import "dotenv/config";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";
import { ensureDemoGallery, removeTrialRental } from "./demo-gallery";

/** Demo içeriğinin sürümü: artırılırsa ön izleme veritabanı bir sonraki açılışta demo veriyle baştan kurulur */
const DEMO_VERSION = 6;

/** Silmeden yükseltme adımları: anahtar = başlangıç sürümü */
const UPGRADES: Record<number, () => Promise<void>> = {
  // 2 → 3: İngilizce içerik ve İngilizce dil
  2: async () => {
    const { seedEnglish } = await import("./lib/seed-en");
    await seedEnglish();
    await db
      .insert(t.settings)
      .values({ key: "i18n", value: { locales: ["tr", "en"], switcher: true } })
      .onConflictDoUpdate({ target: t.settings.key, set: { value: { locales: ["tr", "en"], switcher: true } } });
  },
  // 3 → 4: demo paketler (kombin) ve İngilizce adları
  3: async () => {
    const { seedDemoBundles } = await import("./lib/seed-bundles");
    const { seedEnglish } = await import("./lib/seed-en");
    await seedDemoBundles();
    await seedEnglish();
  },
  // 4 → 5: Minelab odağı kaldırıldı, tüm markalar eşit; çok satanlar önde
  4: async () => {
    const { paletteFromUrl } = await import("../src/lib/palette-core");
    const { seedEnglish } = await import("./lib/seed-en");
    // Öncelikli marka kapalı (varsayılana dön); Minelab'a bağlı kayan yazı / kısayollar varsayılana dönsün
    await db.delete(t.settings).where(sql`${t.settings.key} = 'merch'`);
    await db.delete(t.settings).where(sql`${t.settings.key} in ('ticker', 'nav') and ${t.settings.value}::text like '%/marka/minelab%'`);
    // Markalar alfabetik
    for (const [i, slug] of ["garrett", "minelab", "nokta", "xp"].entries()) {
      await db.update(t.brands).set({ sortOrder: i + 1 }).where(sql`${t.brands.slug} = ${slug}`);
    }
    // Ana banner'lar: Minelab'ın 3 banner'ı yerine her markadan bir çok satan model
    const OLD_HERO = ["Minelab Manticore: define aramada yeni seviye", "Minelab GPZ 8000: mineralli toprakta bile derinde", "Minelab Equinox 900: tarla, plaj, su altı"];
    const old = await db.select({ id: t.banners.id }).from(t.banners).where(sql`${t.banners.placement} = 'HERO' and ${t.banners.title} in (${sql.join(OLD_HERO.map((x) => sql`${x}`), sql`, `)})`);
    if (old.length === OLD_HERO.length) {
      await db.delete(t.banners).where(sql`${t.banners.placement} = 'HERO' and ${t.banners.title} in (${sql.join(OLD_HERO.map((x) => sql`${x}`), sql`, `)})`);
      const HERO = [
        { title: "XP Deus II: tamamen kablosuz, 20 metre su altı", subtitle: "Profesyonel çok frekans", image: "hero-deus-2", linkUrl: "/urun/deus-ii-22-cm-ws6-kulaklik" },
        { title: "Minelab Equinox 900: tarla, plaj, su altı", subtitle: "Çok amaçlı, su geçirmez", image: "hero-equinox-900", linkUrl: "/urun/equinox-900" },
        { title: "Nokta Double Score 2: çift frekans, tam su geçirmez", subtitle: "Define ve altın", image: "hero-double-score-2", linkUrl: "/urun/double-score-2" },
        { title: "Garrett Ace 250: ilk dedektör için en kolay başlangıç", subtitle: "Yeni başlayanlar için", image: "hero-ace-250", linkUrl: "/urun/ace-250" },
      ];
      for (const [i, b] of HERO.entries()) {
        const imageUrl = `/demo/${b.image}.jpg`;
        await db.insert(t.banners).values({ title: b.title, subtitle: b.subtitle, imageUrl, mobileImageUrl: imageUrl.replace(".jpg", "-m.jpg"), linkUrl: b.linkUrl, palette: (await paletteFromUrl(imageUrl)) ?? undefined, placement: "HERO", sortOrder: i, showText: false });
      }
    }
    // Yan kartlar
    await db.update(t.banners).set({ eyebrow: "ÇOK SATAN · MINELAB" }).where(sql`${t.banners.placement} = 'SIDE' and ${t.banners.title} = 'Vanquish 560 Pro-Pack' and ${t.banners.eyebrow} = 'YENİ · MINELAB'`);
    await db.update(t.banners)
      .set({ title: "Double Score 2, 3 taksit", eyebrow: "VADE FARKSIZ · NOKTA", subtitle: "3 × 8.667 TL", imageUrl: "/demo/p/double-score-2-1.jpg", linkUrl: "/urun/double-score-2" })
      .where(sql`${t.banners.placement} = 'SIDE' and ${t.banners.title} = 'Equinox 900, 3 taksit'`);
    // Marka kampanyası tüm markalara açılır
    await db.update(t.campaigns)
      .set({ name: "Sezon indirimi", scope: "ALL", targetIds: [], description: "40.000 TL üzeri dedektör alışverişinde 1.500 TL indirim" })
      .where(sql`${t.campaigns.name} = 'Minelab sezon indirimi'`);
    // Sektörde çok satan modellere rozet
    await db.execute(sql`update products set badges = array_append(coalesce(badges, '{}'), 'Çok satan') where slug in ('ace-250', 'double-score-2', 'pro-pointer-at', 'deus-ii-22-cm-ws6-kulaklik') and not ('Çok satan' = any(coalesce(badges, '{}')))`);
    await seedEnglish();
  },
  // 5 → 6: kaliteli görseller. Ürünler: üretici fotoğrafları (ensureDemoGallery her açılışta yerleştirir).
  // Banner'lar: gerçek saha fotoğraflı, telefona ayrı dikey görsel. Eski demo görsel adresleri yenileriyle değişir.
  5: async () => {
    const { paletteFromUrl } = await import("../src/lib/palette-core");
    const MAP: Record<string, string> = {
      "/demo/banner-deus-2.jpg": "/demo/hero-deus-2.jpg",
      "/demo/banner-equinox-900.jpg": "/demo/hero-equinox-900.jpg",
      "/demo/banner-double-score-2.jpg": "/demo/hero-double-score-2.jpg",
      "/demo/banner-ace-250.jpg": "/demo/hero-ace-250.jpg",
      "/demo/banner-manticore.jpg": "/demo/hero-equinox-900.jpg",
      "/demo/banner-gpz-8000.jpg": "/demo/hero-equinox-900.jpg",
      "/demo/x-terra-pro.jpg": "/demo/p/x-terra-pro-1.jpg",
      "/demo/gold-monster-2000.jpg": "/demo/p/gold-monster-2000-1.jpg",
      "/demo/vanquish-560-pro.jpg": "/demo/p/vanquish-560-pro-pack-1.jpg",
      "/demo/nokta-deephunter-pro-3d.jpg": "/demo/p/deephunter-pro-3d-1.jpg",
      "/demo/garrett-pro-pointer-at.jpg": "/demo/p/pro-pointer-at-1.jpg",
      "/demo/eqx-11-bobin.jpg": "/demo/p/eqx-11-baslik-1.jpg",
      "/demo/nokta-double-score-2.jpg": "/demo/p/double-score-2-1.jpg",
      "/demo/equinox-900.jpg": "/demo/p/equinox-900-1.jpg",
      "/demo/manticore.jpg": "/demo/p/manticore-1.jpg",
      "/demo/gpz-8000.jpg": "/demo/p/gpz-8000-1.jpg",
      "/demo/xp-deus-2.jpg": "/demo/p/deus-ii-22-cm-ws6-kulaklik-1.jpg",
      "/demo/garrett-ace-250.jpg": "/demo/p/ace-250-1.jpg",
    };
    for (const [from, to] of Object.entries(MAP)) {
      const mobile = to.startsWith("/demo/hero-") ? to.replace(".jpg", "-m.jpg") : null;
      await db.update(t.banners).set({ imageUrl: to, ...(mobile ? { mobileImageUrl: mobile, palette: (await paletteFromUrl(to)) ?? undefined } : {}) }).where(sql`${t.banners.imageUrl} = ${from}`);
      await db.update(t.categories).set({ imageUrl: to }).where(sql`${t.categories.imageUrl} = ${from}`);
      await db.execute(sql`update settings set value = replace(value::text, ${from}, ${to})::jsonb where value::text like ${"%" + from + "%"}`);
    }
  },
};

async function main() {
  if (process.env.SEED_DEMO !== "1") return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.products);
  const [ver] = await db.select({ v: t.settings.value }).from(t.settings).where(sql`${t.settings.key} = 'demo'`);
  const current = (ver?.v as { version?: number } | undefined)?.version ?? 1;
  if (n > 0 && current >= 2 && current < DEMO_VERSION) {
    // Sürüm 2'den sonrası verisi silinmeden adım adım yükseltilir; panelde yapılan değişiklikler korunur
    for (let v = current; v < DEMO_VERSION; v++) {
      await UPGRADES[v]?.();
      console.log(`Demo içerik sürümü ${v} → ${v + 1} uygulandı.`);
    }
    await db.insert(t.settings).values({ key: "demo", value: { version: DEMO_VERSION } }).onConflictDoUpdate({ target: t.settings.key, set: { value: { version: DEMO_VERSION } } });
  } else if (n > 0 && current < DEMO_VERSION) {
    console.log(`Demo içerik sürümü ${current} → ${DEMO_VERSION}: ön izleme verisi baştan yükleniyor…`);
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  } else if (n > 0) {
    console.log(`Veritabanında ${n} ürün var, demo veri yüklenmedi.`);
  } else {
    console.log("Veritabanı boş: demo veri yükleniyor…");
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  }
  // Var olan ön izleme veritabanına da test galerisini ekle (yalnızca tek görselli demo ürünlere)
  await ensureDemoGallery();
  await removeTrialRental();
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && pw.length >= 10) {
    await db.update(t.users).set({ passwordHash: await bcrypt.hash(pw, 10) }).where(sql`${t.users.email} like '%@derinova.local'`);
    console.log("Demo panel hesaplarının şifresi ADMIN_PASSWORD ile güncellendi.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
