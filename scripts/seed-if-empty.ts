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
const DEMO_VERSION = 3;

async function main() {
  if (process.env.SEED_DEMO !== "1") return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.products);
  const [ver] = await db.select({ v: t.settings.value }).from(t.settings).where(sql`${t.settings.key} = 'demo'`);
  const current = (ver?.v as { version?: number } | undefined)?.version ?? 1;
  if (n > 0 && current === 2) {
    // 2 → 3: yalnızca İngilizce içerik eklenir; panelde yapılan değişiklikler (görseller, ürünler) silinmez
    const { seedEnglish } = await import("./lib/seed-en");
    console.log(`Demo içerik sürümü 2 → 3: ${await seedEnglish()} İngilizce çeviri eklendi.`);
    await db
      .insert(t.settings)
      .values({ key: "i18n", value: { locales: ["tr", "en"], switcher: true } })
      .onConflictDoUpdate({ target: t.settings.key, set: { value: { locales: ["tr", "en"], switcher: true } } });
    await db.insert(t.settings).values({ key: "demo", value: { version: 3 } }).onConflictDoUpdate({ target: t.settings.key, set: { value: { version: 3 } } });
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
