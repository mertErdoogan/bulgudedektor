/* Ön izleme ortamı açılışı: veritabanı boşsa (hiç ürün yoksa) demo veriyi yükler; doluysa hiçbir şeye dokunmaz.
   Böylece her güncellemede (deploy) veriler silinmez, yalnızca ilk kurulumda demo içerik gelir.
   SEED_DEMO=1 değilse hiçbir şey yapmaz. ADMIN_PASSWORD verilmişse demo hesapların şifresi onunla değiştirilir. */
import "dotenv/config";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";
import { ensureDemoGallery } from "./demo-gallery";

async function main() {
  if (process.env.SEED_DEMO !== "1") return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.products);
  if (n > 0) {
    console.log(`Veritabanında ${n} ürün var, demo veri yüklenmedi.`);
  } else {
    console.log("Veritabanı boş: demo veri yükleniyor…");
    execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
  }
  // Var olan ön izleme veritabanına da test galerisini ekle (yalnızca tek görselli demo ürünlere)
  await ensureDemoGallery();
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && pw.length >= 10) {
    await db.update(t.users).set({ passwordHash: await bcrypt.hash(pw, 10) }).where(sql`${t.users.email} like '%@arenadedektor.local'`);
    console.log("Demo panel hesaplarının şifresi ADMIN_PASSWORD ile güncellendi.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
