/* Canlı kurulum: roller, ilk yönetici, varsayılan sayfa/menü/ana sayfa bölümleri. Mevcut veriye dokunmaz, tekrar çalıştırılabilir.
   Kullanım: ADMIN_EMAIL=ben@firma.com ADMIN_PASSWORD='GüçlüŞifre123' npm run db:init */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { LEGACY_REDIRECTS } from "./lib/arena-map";
import { LEGAL_PAGES } from "./lib/legal-texts";
import { DEFAULT_TEMPLATES } from "../src/lib/templates";

async function main() {
  for (const r of DEFAULT_ROLES) {
    const ex = await db.query.roles.findFirst({ where: eq(t.roles.key, r.key) });
    if (!ex) await db.insert(t.roles).values({ ...r, permissions: [...r.permissions], isSystem: r.key === "admin" });
    else if (r.key === "admin") await db.update(t.roles).set({ permissions: [...r.permissions] }).where(eq(t.roles.id, ex.id));
  }
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const pw = process.env.ADMIN_PASSWORD;
  if (email && pw) {
    if (pw.length < 10) throw new Error("ADMIN_PASSWORD en az 10 karakter olmalı.");
    const admin = await db.query.roles.findFirst({ where: eq(t.roles.key, "admin") });
    const ex = await db.query.users.findFirst({ where: eq(t.users.email, email) });
    if (!ex) await db.insert(t.users).values({ name: process.env.ADMIN_NAME || "Yönetici", email, passwordHash: await bcrypt.hash(pw, 10), roleId: admin!.id, maxDiscountPct: 100 });
    console.log(ex ? `${email} zaten var.` : `Yönetici oluşturuldu: ${email}`);
  }
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.homeSections);
  if (!n)
    await db.insert(t.homeSections).values([
      { type: "WIZARD_BAND", sortOrder: 0, title: "Hangi dedektörü alacağını bilmiyor musun?", subtitle: "6 kısa soru, yaklaşık 1 dakika. Sana uygun 3 cihazı nedenleriyle gösterelim." },
      { type: "CATEGORY_TILES", sortOrder: 1, title: "Ne arıyorsun?", subtitle: "Seç, gerisini bize bırak." },
      { type: "PRODUCT_TABS", sortOrder: 2, title: "Çok satanlar", config: { limit: 10 } },
      { type: "EXPERT_BAND", sortOrder: 3, title: "Kararsız mı kaldın? Bir uzman cihazı kamerada göstersin." },
      { type: "PRODUCT_ROW", sortOrder: 4, title: "Profesyonel ve derin arama", config: { limit: 5 } },
      { type: "TRUST", sortOrder: 5 },
    ]);
  // Yasal sayfalar (şirket bilgileri ayarlardan otomatik dolar) ve eski site adres yönlendirmeleri
  for (const p of LEGAL_PAGES) await db.insert(t.pages).values(p).onConflictDoNothing();
  // Hazır yanıt şablonları (yalnızca hiç yoksa)
  if (!(await db.select({ id: t.replyTemplates.id }).from(t.replyTemplates).limit(1)).length)
    await db.insert(t.replyTemplates).values(DEFAULT_TEMPLATES.map((x, i) => ({ ...x, sortOrder: i })));
  await db.insert(t.redirects).values(LEGACY_REDIRECTS.map(([fromPath, toPath]) => ({ fromPath, toPath }))).onConflictDoNothing();
  const [{ m }] = await db.select({ m: sql<number>`count(*)::int` }).from(t.menuItems);
  if (!m)
    await db.insert(t.menuItems).values([
      { location: "HEADER", label: "Kampanyalar", url: "/kampanyalar", sortOrder: 99, highlight: true },
      { location: "FOOTER_HELP", label: "Sipariş takibi", url: "/siparis-takip", sortOrder: 0 },
      { location: "FOOTER_HELP", label: "Servis kaydı", url: "/servis", sortOrder: 1 },
      { location: "FOOTER_HELP", label: "Seri no sorgula", url: "/seri-no", sortOrder: 2 },
      { location: "FOOTER_HELP", label: "İletişim", url: "/iletisim", sortOrder: 3 },
    ]);
  console.log("Kurulum tamam. /admin/giris ile giriş yapıp Kurulum sihirbazını izleyin.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
