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
const DEMO_VERSION = 4;

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
