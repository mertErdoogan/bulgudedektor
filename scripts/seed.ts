/* Demo verisi: npm run db:seed  (mevcut veriyi SİLER, sadece kurulumda kullanın) */
import { paletteFromUrl } from "../src/lib/palette-core";
import "dotenv/config";
import { DEMO_IMAGES, ensureDemoGallery } from "./demo-gallery";
import { DEMO_ABOUT, DEMO_BANK_ACCOUNTS, DEMO_PICKUP, DEMO_BRAND, DEMO_CATALOG, DEMO_NAV_SHORTCUTS, DEMO_SEO, DEMO_STORE, DEMO_TICKER } from "./lib/demo-store";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";
import { DEFAULT_ROLES } from "../src/lib/permissions";
import { seedContent } from "./seed-content";
import { seedEnglish } from "./lib/seed-en";
import { seedDemoBundles } from "./lib/seed-bundles";
import { LEGAL_PAGES } from "./lib/legal-texts";
import { DEFAULT_TEMPLATES } from "../src/lib/templates";

const img = (f: string) => `/demo/${f}.jpg`;
/** Ürünün temiz ana görseli (beyaz zemin, 1200×1200) */
const pimg = (slug: string) => `/demo/p/${slug}-1.jpg`;
const daysAgo = (d: number, h = 12) => new Date(Date.now() - d * 86400000 - h * 3600000);
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function main() {
  console.log("Tablolar temizleniyor…");
  await db.execute(sql`TRUNCATE roles, users, audit_logs, brands, categories, products, product_images, serial_numbers, stock_movements,
    media_assets, customers, addresses, customer_notes, conversations, messages, service_records, reviews, product_questions, stock_alerts,
    newsletter_subscribers, campaigns, orders, order_items, order_events, return_requests, banners, home_sections, pages, menu_items, settings, posts, faqs, redirects, search_queries, product_activity, favorites, cart_snapshots, password_resets, reply_templates, staff_notifications, rate_hits, translations, bundles, bundle_items, live_carts RESTART IDENTITY CASCADE`);

  // Roller ve ekip
  const roleRows = await db.insert(t.roles).values(DEFAULT_ROLES.map((r) => ({ ...r, permissions: [...r.permissions], isSystem: r.key === "admin" }))).returning();
  const role = (k: string) => roleRows.find((r) => r.key === k)!.id;
  const pw = await bcrypt.hash("Demo12345!", 10);
  const [admin, sales, depo, servis] = await db
    .insert(t.users)
    .values([
      { name: "Yönetici", email: "admin@derinova.local", passwordHash: pw, roleId: role("admin"), maxDiscountPct: 100 },
      { name: "Elif Satış", email: "satis@derinova.local", passwordHash: pw, roleId: role("sales"), maxDiscountPct: 5 },
      { name: "Murat Depo", email: "depo@derinova.local", passwordHash: pw, roleId: role("warehouse") },
      { name: "Kemal Servis", email: "servis@derinova.local", passwordHash: pw, roleId: role("service") },
    ])
    .returning();

  // Markalar
  const brandRows = await db
    .insert(t.brands)
    .values([
      // Markalar eşit: alfabetik sıra
      { name: "Garrett", slug: "garrett", sortOrder: 1, description: "ABD merkezli; Ace, AT ve Vortex serileri." },
      { name: "Minelab", slug: "minelab", sortOrder: 2, description: "Avustralya merkezli; Multi-IQ ve PI teknolojileri." },
      { name: "Nokta", slug: "nokta", sortOrder: 3, description: "Türk üretici; Double Score, FindX ve görüntüleme sistemleri." },
      { name: "XP", slug: "xp", sortOrder: 4, description: "Fransız üretici; Deus serisi kablosuz dedektörler." },
    ])
    .returning();
  const brand = (s: string) => brandRows.find((b) => b.slug === s)!.id;

  // Kategoriler
  const catRows = await db
    .insert(t.categories)
    .values([
      { name: "Define ve sikke", slug: "define-ve-sikke", shortText: "Tarla, bağ, harabe", sortOrder: 1, imageUrl: pimg("x-terra-pro"), description: "Sikke, takı ve gömülü metaller için iyi ayrım yapan cihazlar." },
      { name: "Doğal altın", slug: "dogal-altin", shortText: "Nugget, maden sahası", sortOrder: 2, imageUrl: pimg("gold-monster-2000"), description: "Mineralli zeminde küçük doğal altına hassas cihazlar." },
      { name: "Sahil ve su altı", slug: "sahil-ve-su-alti", shortText: "Kayıp takı, dalış", sortOrder: 3, imageUrl: pimg("vanquish-560-pro-pack"), description: "Tuzlu ıslak kum, sıradan cihazlarda sürekli parazit yapar. Buradaki modeller çok frekanslı veya sahil modu olan, en az kısmen su geçirmez cihazlar." },
      { name: "Derin arama", slug: "derin-arama", shortText: "Görüntülü, 3D", sortOrder: 4, imageUrl: pimg("deephunter-pro-3d"), description: "Büyük ve derin hedefler için görüntüleme sistemleri ve büyük başlıklı cihazlar." },
      { name: "Pointer", slug: "pointer", shortText: "Nokta tespiti", sortOrder: 5, imageUrl: pimg("pro-pointer-at"), description: "Kazıda hedefi saniyeler içinde bulmanı sağlayan el tipi dedektörler." },
      { name: "Başlık ve aksesuar", slug: "baslik-ve-aksesuar", shortText: "Bobin, kulaklık, batarya", sortOrder: 6, imageUrl: pimg("eqx-11-baslik"), description: "Cihazına uyumlu başlık, kulaklık ve bataryalar." },
    ])
    .returning();
  const cat = (s: string) => catRows.find((c) => c.slug === s)!.id;

  type P = Partial<typeof t.products.$inferInsert> & { name: string; sku: string; price: number; image: string };
  const P: P[] = [
    { name: "Vanquish 560 Pro-Pack", sku: "3820-0009", price: 49588, costPrice: 38900, compareAtPrice: 52900, brandId: brand("minelab"), categoryId: cat("define-ve-sikke"), image: "vanquish-560-pro", stock: 7, technology: "MULTI", waterproof: "COIL_ONLY", experience: "BEGINNER", useCases: ["sahil", "define"], badges: ["Çok satan"], weightKg: 1.26, isFeatured: true, trackSerial: true,
      shortDescription: "Aç ve ara: 4 hazır mod, çok frekanslı Multi-IQ, iki su geçirmez başlık ve kablosuz kulaklık bir arada.",
      idealFor: ["Park, arazi ve plaj modlarıyla açıp hemen aramaya başlarsın", "Başlık 1 metreye kadar su geçirmez", "Kablosuz kulaklıkla gecikmesiz ses", "Pinpoint ile hedefin merkezini bulursun"],
      notFor: ["Çok derindeki büyük hedefler için değil", "Gövde su altına girmez"],
      boxContents: ["Kontrol ünitesi ve şase", "V12X 12×9\" başlık + kapak", "V8X 8×5\" başlık + kapak", "ML60 kablosuz kulaklık", "Manyetik şarj kablosu", "Kılavuz ve garanti belgesi"],
      specs: [{ key: "Frekans", value: "Multi-IQ (eşzamanlı çok frekans)" }, { key: "Ağırlık", value: "1,26 kg" }, { key: "Uzunluk", value: "79 cm katlı · 142 cm açık" }, { key: "Su geçirmezlik", value: "Başlık IP68" }, { key: "Hassasiyet", value: "10 seviye" }, { key: "Hedef tonları", value: "5 ton" }] },
    { name: "Deus II 22 cm · WS6 kulaklık", sku: "XP-DEUS2-22", price: 108412, costPrice: 88000, brandId: brand("xp"), categoryId: cat("define-ve-sikke"), image: "xp-deus-2", stock: 3, technology: "MULTI", waterproof: "FULL", experience: "PRO", useCases: ["define", "sahil"], trackSerial: true, weightKg: 0.75,
      shortDescription: "Tamamen kablosuz, 20 m su geçirmez, çok frekanslı profesyonel dedektör.",
      specs: [{ key: "Frekans", value: "FMF çok frekans + 6 tek frekans" }, { key: "Ağırlık", value: "750 g" }, { key: "Su geçirmezlik", value: "20 m" }] },
    { name: "Ace 250", sku: "GAR-ACE250", price: 22163, costPrice: 16500, brandId: brand("garrett"), categoryId: cat("define-ve-sikke"), image: "garrett-ace-250", stock: 12, technology: "VLF", waterproof: "COIL_ONLY", experience: "BEGINNER", useCases: ["define"], weightKg: 1.2, isFeatured: true,
      shortDescription: "İlk cihaz için klasik: basit menü, güvenilir ayrım.", specs: [{ key: "Frekans", value: "6,5 kHz" }, { key: "Ağırlık", value: "1,2 kg" }] },
    { name: "Double Score 2", sku: "NOK-DS2", price: 26000, costPrice: 19800, brandId: brand("nokta"), categoryId: cat("define-ve-sikke"), image: "nokta-double-score-2", stock: 9, technology: "VLF", waterproof: "FULL", experience: "INTERMEDIATE", useCases: ["define", "altin"], weightKg: 1.4, isFeatured: true,
      shortDescription: "Yerli üretim, çift frekanslı, su geçirmez." },
    { name: "Equinox 900", sku: "3720-0007", price: 99682, costPrice: 79000, brandId: brand("minelab"), categoryId: cat("sahil-ve-su-alti"), image: "equinox-900", stock: 4, technology: "MULTI", waterproof: "FULL", experience: "PRO", useCases: ["sahil", "define", "altin"], trackSerial: true, weightKg: 1.34, isFeatured: true,
      shortDescription: "Kara, sahil ve su altında tek cihaz: Multi-IQ+, 5 m su geçirmez." },
    { name: "X-Terra Pro", sku: "3820-0001", price: 30107, costPrice: 23400, brandId: brand("minelab"), categoryId: cat("define-ve-sikke"), image: "x-terra-pro", stock: 10, technology: "VLF", waterproof: "FULL", experience: "INTERMEDIATE", useCases: ["define", "sahil"], weightKg: 1.3, isFeatured: true,
      shortDescription: "Seçilebilir frekans, tamamen su geçirmez, uygun fiyatlı.", notFor: ["Aynı anda tek frekansta çalışır"] },
    { name: "Vortex VX9", sku: "GAR-VX9", price: 63756, costPrice: 51000, brandId: brand("garrett"), categoryId: cat("define-ve-sikke"), image: "garrett-vortex-vx9", stock: 2, technology: "MULTI", waterproof: "FULL", experience: "PRO", useCases: ["define", "sahil"], trackSerial: true, isFeatured: true },
    { name: "FindX Pro", sku: "NOK-FINDXPRO", price: 12500, costPrice: 9100, brandId: brand("nokta"), categoryId: cat("define-ve-sikke"), image: "nokta-findx-pro", stock: 15, technology: "VLF", waterproof: "FULL", experience: "BEGINNER", useCases: ["define"], isFeatured: true },
    { name: "Pro-Pointer AT", sku: "GAR-PPAT", price: 12751, costPrice: 9200, brandId: brand("garrett"), categoryId: cat("pointer"), image: "garrett-pro-pointer-at", stock: 20, technology: "OTHER", waterproof: "FULL", useCases: ["pointer"], isFeatured: true,
      shortDescription: "Kazıda hedefi saniyede bul. 3 m su geçirmez." },
    { name: "Apex Raider Paket", sku: "GAR-APEX-R", price: 34990, costPrice: 27000, brandId: brand("garrett"), categoryId: cat("define-ve-sikke"), image: "garrett-apex-raider", stock: 5, technology: "MULTI", waterproof: "COIL_ONLY", experience: "BEGINNER", useCases: ["define", "sahil"] },
    { name: "GPZ 8000", sku: "3510-0001", price: 759000, costPrice: 640000, brandId: brand("minelab"), categoryId: cat("dogal-altin"), image: "gpz-8000", stock: 1, technology: "PI", waterproof: "COIL_ONLY", experience: "PRO", useCases: ["altin", "derin"], isPro: true, trackSerial: true },
    { name: "GPX 6000", sku: "3730-0001", price: 480700, costPrice: 400000, brandId: brand("minelab"), categoryId: cat("dogal-altin"), image: "gpx-6000", stock: 2, technology: "PI", waterproof: "COIL_ONLY", experience: "PRO", useCases: ["altin"], isPro: true, trackSerial: true },
    { name: "Deephunter Pro 3D", sku: "NOK-DH3D", price: 243000, costPrice: 196000, brandId: brand("nokta"), categoryId: cat("derin-arama"), image: "nokta-deephunter-pro-3d", stock: 1, technology: "IMAGING", waterproof: "NONE", experience: "PRO", useCases: ["derin"], isPro: true, trackSerial: true },
    { name: "Gold Monster 2000", sku: "3740-0001", price: 207460, costPrice: 170000, brandId: brand("minelab"), categoryId: cat("dogal-altin"), image: "gold-monster-2000", stock: 0, technology: "PI", waterproof: "COIL_ONLY", experience: "INTERMEDIATE", useCases: ["altin"], isPro: true, trackSerial: true },
    { name: "Manticore", sku: "3830-0001", price: 141680, costPrice: 115000, brandId: brand("minelab"), categoryId: cat("define-ve-sikke"), image: "manticore", stock: 3, technology: "MULTI", waterproof: "FULL", experience: "PRO", useCases: ["define", "derin"], badges: ["Yeni"], isPro: true, trackSerial: true },
    { name: "Go-Find 66", sku: "3820-0066", price: 24541, costPrice: 18000, brandId: brand("minelab"), categoryId: cat("define-ve-sikke"), image: "go-find-66", stock: 6, technology: "VLF", waterproof: "NONE", experience: "BEGINNER", useCases: ["define"] },
    { name: "EQX 11 Başlık", sku: "3011-0371", price: 22770, costPrice: 16000, brandId: brand("minelab"), categoryId: cat("baslik-ve-aksesuar"), image: "eqx-11-bobin", stock: 8, useCases: [], shortDescription: "Equinox serisi ile uyumlu 11\" çift D başlık." },
  ];

  const prodRows = [];
  for (const [i, p] of P.entries()) {
    const { image, ...rest } = p;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9ğüşöçı]+/gi, "-").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/^-|-$/g, "");
    const [row] = await db
      .insert(t.products)
      .values({
        ...rest,
        slug,
        status: "ACTIVE",
        sortOrder: i,
        specs: (rest.specs as t.Spec[]) ?? [],
        // Demo: ilk 5 ürün "yeni", diğerleri daha eski; birkaç üründe indirim
        createdAt: new Date(Date.now() - (i < 5 ? 2 + i * 3 : 45 + i * 4) * 86400000),
        compareAtPrice: "compareAtPrice" in rest && rest.compareAtPrice ? rest.compareAtPrice : [3, 6, 9, 12].includes(i) ? Math.round((rest.price * 1.09) / 100) * 100 : null,
      })
      .returning();
    const gallery = DEMO_IMAGES[slug] ?? [img(image)];
    await db.insert(t.productImages).values(gallery.map((url, k) => ({ productId: row.id, url, alt: k ? `${p.name} (${k + 1})` : p.name, sortOrder: k })));
    if (row.trackSerial && row.stock > 0) {
      await db.insert(t.serialNumbers).values(Array.from({ length: row.stock }, (_, k) => ({ productId: row.id, serial: `${row.sku}-${String(1000 + k)}` })));
    }
    await db.insert(t.stockMovements).values({ productId: row.id, delta: row.stock, reason: "INITIAL", userId: admin.id, note: "Açılış stoğu" });
    prodRows.push(row);
  }

  // Vitrin
  // Demo ana banner'ları: mağaza çalışanlarının hazırladığı türden, yazısı görselin içinde olan hazır görseller
  const HERO_BANNERS = [
    // Her markadan sektörün çok satan bir modeli
    { title: "XP Deus II: tamamen kablosuz, 20 metre su altı", subtitle: "Profesyonel çok frekans", image: "hero-deus-2", linkUrl: "/urun/deus-ii-22-cm-ws6-kulaklik" },
    { title: "Minelab Equinox 900: tarla, plaj, su altı", subtitle: "Çok amaçlı, su geçirmez", image: "hero-equinox-900", linkUrl: "/urun/equinox-900" },
    { title: "Nokta Double Score 2: çift frekans, tam su geçirmez", subtitle: "Define ve altın", image: "hero-double-score-2", linkUrl: "/urun/double-score-2" },
    { title: "Garrett Ace 250: ilk dedektör için en kolay başlangıç", subtitle: "Yeni başlayanlar için", image: "hero-ace-250", linkUrl: "/urun/ace-250" },
  ];
  const heroRows = [];
  for (const [i, b] of HERO_BANNERS.entries()) {
    const imageUrl = img(b.image);
    heroRows.push({ title: b.title, subtitle: b.subtitle, imageUrl, mobileImageUrl: img(`${b.image}-m`), imageUrlEn: img(`${b.image}-en`), mobileImageUrlEn: img(`${b.image}-en-m`), linkUrl: b.linkUrl, palette: (await paletteFromUrl(imageUrl)) ?? undefined, placement: "HERO" as const, sortOrder: i, showText: false });
  }
  await db.insert(t.banners).values([
    ...heroRows,
    { title: "Vanquish 560 Pro-Pack", eyebrow: "ÇOK SATAN · MINELAB", subtitle: "49.588 TL'den", imageUrl: pimg("vanquish-560-pro-pack"), linkUrl: "/urun/vanquish-560-pro-pack", placement: "SIDE", sortOrder: 0 },
    { title: "Double Score 2, 3 taksit", eyebrow: "VADE FARKSIZ · NOKTA", subtitle: "3 × 8.667 TL", imageUrl: pimg("double-score-2"), linkUrl: "/urun/double-score-2", placement: "SIDE", sortOrder: 1 },
    { title: "Kazıda hedefi saniyede bul", eyebrow: "POINTER · GARRETT", subtitle: "12.751 TL'den", imageUrl: pimg("pro-pointer-at"), linkUrl: "/kategori/pointer", placement: "SIDE", sortOrder: 2 },
  ]);
  await db.insert(t.homeSections).values([
    { type: "WIZARD_BAND", sortOrder: 1, title: "Hangi dedektörü alacağını bilmiyor musun?", subtitle: "6 kısa soru, yaklaşık 1 dakika. Sana uygun 3 cihazı nedenleriyle gösterelim." },
    { type: "CATEGORY_TILES", sortOrder: 0, title: "Ne arıyorsun?", subtitle: "Seç, gerisini bize bırak." },
    { type: "PRODUCT_TABS", sortOrder: 2, title: "Çok satanlar", config: { tabs: ["featured", "new", "deals", "sameday"], limit: 10 } },
    { type: "BRANDS", sortOrder: 3, title: "Markaya göre alışveriş", subtitle: "Markanı seç, kategorisine göre modelleri gör" },
    { type: "EXPERT_BAND", sortOrder: 4, title: "Kararsız mı kaldın? Bir uzmana sor." },
    { type: "PRODUCT_ROW", sortOrder: 5, title: "Profesyonel ve derin arama", config: { filter: "pro", limit: 5 } },
    { type: "TRUST", sortOrder: 6 },
    { type: "CATEGORY_RAILS", sortOrder: 7, title: "Kategorilere göre", config: { count: 4 } },
  ]);
  await db.insert(t.menuItems).values([
    { location: "HEADER", label: "Define Dedektörü", url: "/kategori/define-ve-sikke", sortOrder: 0 },
    { location: "HEADER", label: "Altın Dedektörü", url: "/kategori/dogal-altin", sortOrder: 1 },
    { location: "HEADER", label: "Sualtı", url: "/kategori/sahil-ve-su-alti", sortOrder: 2 },
    { location: "HEADER", label: "Başlık ve Aksesuar", url: "/kategori/baslik-ve-aksesuar", sortOrder: 3 },
    { location: "HEADER", label: "Pointer", url: "/kategori/pointer", sortOrder: 4 },
    { location: "HEADER", label: "Kampanyalar", url: "/kampanyalar", sortOrder: 5, highlight: true },
    { location: "HEADER", label: "Hakkımızda", url: "/sayfa/hakkimizda", sortOrder: 6 },
    { location: "HEADER", label: "İletişim", url: "/iletisim", sortOrder: 7 },
    { location: "HEADER", label: "Yardım", url: "/sss", sortOrder: 8 },
    { location: "HEADER", label: "Blog", url: "/blog", sortOrder: 9 },
    { location: "FOOTER_HELP", label: "Sipariş takibi", url: "/siparis-takip", sortOrder: 0 },
    { location: "FOOTER_HELP", label: "İade talebi", url: "/hesabim", sortOrder: 1 },
    { location: "FOOTER_HELP", label: "Servis kaydı", url: "/servis", sortOrder: 2 },
    { location: "FOOTER_HELP", label: "Seri no sorgula", url: "/seri-no", sortOrder: 3 },
    { location: "FOOTER_HELP", label: "İletişim", url: "/iletisim", sortOrder: 4 },
  ]);
  // Demo mağazanın Hakkımızda metni (gerçek kurulumda genel şablon kalır)
  await db.insert(t.pages).values(LEGAL_PAGES.map((p) => (p.slug === "hakkimizda" ? { ...p, ...DEMO_ABOUT } : p)));
  // Hazır yanıt şablonları (yalnızca hiç yoksa)
  if (!(await db.select({ id: t.replyTemplates.id }).from(t.replyTemplates).limit(1)).length)
    await db.insert(t.replyTemplates).values(DEFAULT_TEMPLATES.map((x, i) => ({ ...x, sortOrder: i })));
  // Sektörde çok satan modeller (markalara dağılmış)
  await db.update(t.products).set({ badges: ["Çok satan"] }).where(sql`${t.products.slug} in ('ace-250', 'double-score-2', 'pro-pointer-at', 'deus-ii-22-cm-ws6-kulaklik')`);
  // Demo varyant: aynı ailenin iki modeli ürün sayfasında seçenek olarak görünür
  await db.update(t.products).set({ variantGroup: "minelab-gp", variantLabel: "GPZ 8000 · ZVT" }).where(sql`${t.products.slug} = 'gpz-8000'`);
  await db.update(t.products).set({ variantGroup: "minelab-gp", variantLabel: "GPX 6000 · PI" }).where(sql`${t.products.slug} = 'gpx-6000'`);

  // Kampanyalar (markadan bağımsız)
  await db.insert(t.campaigns).values([
    { name: "Hoş geldin indirimi", code: "HOSGELDIN", type: "PERCENT", value: 5, minSubtotal: 10000, maxDiscount: 3000, description: "İlk alışverişe %5, en fazla 3.000 TL", showOnSite: true, perCustomerLimit: 1 },
    { name: "Pointer'da kargo bedava", type: "FREE_SHIPPING", value: 0, scope: "CATEGORY", targetIds: [cat("pointer")], description: "Pointer alışverişlerinde kargo ücretsiz" },
    { name: "Sezon indirimi", type: "FIXED", value: 1500, minSubtotal: 40000, description: "40.000 TL üzeri dedektör alışverişinde 1.500 TL indirim", showOnSite: true, endsAt: new Date(Date.now() + 20 * 86400000) },
  ]);

  // Paketler (kombin): dedektör + pinpointer, birlikte alınca indirimli
  await seedDemoBundles();

  // Müşteriler, siparişler
  const names = ["Ahmet Yılmaz", "Mehmet Kaya", "Ayşe Demir", "Mustafa Çelik", "Fatma Şahin", "Ali Öztürk", "Hasan Arslan", "Emine Doğan", "Hüseyin Kılıç", "Zeynep Aydın", "İbrahim Koç", "Osman Kurt"];
  const cities = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Trabzon", "Konya", "Kayseri"];
  const cust = await db
    .insert(t.customers)
    .values(names.map((n, i) => ({ name: n, email: `musteri${i + 1}@ornek.com`, phone: `+90555${String(1000000 + i * 7311).slice(0, 7)}`, marketingConsent: i % 3 === 0, createdAt: daysAgo(80 - i * 5), tags: i % 4 === 0 ? ["VIP"] : [] })))
    .returning();
  await db.update(t.customers).set({ passwordHash: pw }).where(sql`${t.customers.email} = 'musteri1@ornek.com'`);
  for (const c of cust) {
    await db.insert(t.addresses).values({ customerId: c.id, fullName: c.name, phone: c.phone!, city: rand(cities), district: "Merkez", line: "Örnek Mah. Deneme Sk. No: 1", isDefault: true });
  }

  // Demo satışlar sektörde çok satan modellere ağırlıklı ve markalara dağılmış: çok satanlar rafı gerçekçi görünsün
  const POPULAR: Record<string, number> = { "vanquish-560-pro-pack": 10, "ace-250": 9, "double-score-2": 8, "pro-pointer-at": 7, "equinox-900": 6, "deus-ii-22-cm-ws6-kulaklik": 6, "findx-pro": 5, "x-terra-pro": 4, "apex-raider-paket": 4, "vortex-vx9": 3, "go-find-66": 2 };
  const bag = prodRows.flatMap((x) => Array(POPULAR[x.slug] ?? (x.price < 120000 ? 1 : 0)).fill(x));
  const popular = () => rand(bag);
  const statuses: (typeof t.orderStatus.enumValues)[number][] = ["DELIVERED", "DELIVERED", "DELIVERED", "SHIPPED", "PREPARING", "PAID", "PAID", "CANCELLED"];
  for (let i = 0; i < 46; i++) {
    const c = rand(cust);
    const p = popular();
    const qty = p.price < 20000 && Math.random() > 0.7 ? 2 : 1;
    const second = Math.random() > 0.75 ? rand(prodRows.filter((x) => x.categoryId === cat("pointer") || x.categoryId === cat("baslik-ve-aksesuar"))) : null;
    const items = [{ p, qty }, ...(second && second.id !== p.id ? [{ p: second, qty: 1 }] : [])];
    const subtotal = items.reduce((s, x) => s + x.p.price * x.qty, 0);
    // Açık (hazırlanacak/kargolanacak) siparişler son 2 güne düşer; eski tarihli açık sipariş gerçekçi olmaz
    const status = i < 4 ? rand(["PAID", "PREPARING"] as const) : (() => {
      const st = rand(statuses);
      return st === "PAID" || st === "PREPARING" ? rand(["DELIVERED", "SHIPPED"] as const) : st;
    })();
    const created = status === "PAID" || status === "PREPARING" ? new Date(Date.now() - (2 + i * 9) * 3600_000) : status === "SHIPPED" ? daysAgo(1 + (i % 3), 0) : daysAgo(4 + Math.floor(Math.random() * 56), Math.floor(Math.random() * 20));
    const [o] = await db
      .insert(t.orders)
      .values({
        customerId: c.id,
        email: c.email!,
        phone: c.phone!,
        status,
        paymentStatus: status === "CANCELLED" ? "FAILED" : "PAID",
        paidAt: status === "CANCELLED" ? null : created,
        paymentMethod: Math.random() > 0.8 ? "TRANSFER" : "CARD",
        installments: rand([1, 1, 3, 3, 6]),
        subtotal,
        total: subtotal,
        shippingAddress: { fullName: c.name, phone: c.phone!, city: rand(cities), district: "Merkez", line: "Örnek Mah. Deneme Sk. No: 1" },
        carrier: ["SHIPPED", "DELIVERED"].includes(status) ? "Yurtiçi Kargo" : null,
        trackingNumber: ["SHIPPED", "DELIVERED"].includes(status) ? String(700000000 + i * 137) : null,
        shippedAt: ["SHIPPED", "DELIVERED"].includes(status) ? new Date(created.getTime() + 86400000) : null,
        // Teslim edilmiş eski siparişlerin çoğunun faturası eklenmiş olsun (iş listesinde birkaç eksik kalsın)
        ...(status === "DELIVERED" && i % 6 ? { invoiceNo: `DRN2026${String(100000 + i)}`, invoiceUrl: "/demo/invoice-sample.pdf", invoicedAt: new Date(created.getTime() + 86400000) } : {}),
        deliveredAt: status === "DELIVERED" ? new Date(created.getTime() + 3 * 86400000) : null,
        createdAt: created,
      })
      .returning();
    await db.insert(t.orderItems).values(
      items.map((x) => ({ orderId: o.id, productId: x.p.id, name: x.p.name, sku: x.p.sku, imageUrl: null, unitPrice: x.p.price, unitCost: x.p.costPrice, quantity: x.qty, total: x.p.price * x.qty })),
    );
    await db.insert(t.orderEvents).values({ orderId: o.id, type: "created", message: "Sipariş oluşturuldu.", createdAt: created });
  }

  // CRM
  const conv = await db
    .insert(t.conversations)
    .values([
      { customerId: cust[0].id, contactName: cust[0].name, contact: cust[0].phone!, channel: "WHATSAPP", subject: "Vanquish 560 mı X-Terra Pro mu?", productId: prodRows[0].id, assigneeId: sales.id },
      { customerId: cust[2].id, contactName: cust[2].name, contact: cust[2].email!, channel: "WEB", subject: "Kargom nerede?", status: "PENDING" },
      { contactName: "Serkan B.", contact: "+905551112233", channel: "INSTAGRAM", subject: "Karadeniz için hangi cihaz?" },
    ])
    .returning();
  await db.insert(t.messages).values([
    { conversationId: conv[0].id, body: "Merhaba, sahilde ve tarlada kullanacağım. Vanquish 560 mı X-Terra Pro mu almalıyım?" },
    { conversationId: conv[0].id, body: "Merhaba Ahmet Bey, ıslak kumda Vanquish 560 çok frekanslı olduğu için daha sakin çalışır. Suya girecekseniz X-Terra Pro.", fromStaff: true, userId: sales.id },
    { conversationId: conv[1].id, body: "Siparişim 2 gündür kargoda görünmüyor." },
    { conversationId: conv[2].id, body: "Karadeniz'de demirli topraklarda hangi cihazı önerirsiniz?" },
  ]);
  await db.insert(t.customerNotes).values({ customerId: cust[0].id, userId: sales.id, body: "Sahil + tarla kullanacak, bütçe 50 bin civarı. Pazartesi geri dönülecek." });
  await db.insert(t.serviceRecords).values([
    { customerId: cust[3].id, contactName: cust[3].name, contact: cust[3].phone!, productName: "Pro-Pointer AT", serial: "GAR-PPAT-9921", issue: "Ses gelmiyor, titreşim var.", status: "IN_REPAIR", assigneeId: servis.id, history: [{ status: "RECEIVED", at: daysAgo(6).toISOString() }, { status: "IN_REPAIR", at: daysAgo(2).toISOString(), by: "Kemal Servis" }] },
    { customerId: cust[5].id, contactName: cust[5].name, contact: cust[5].phone!, productName: "Equinox 900", serial: "3720-0007-1001", issue: "Ekran açılmıyor.", status: "RECEIVED", history: [{ status: "RECEIVED", at: daysAgo(1).toISOString() }] },
  ]);
  await db.insert(t.reviews).values([
    { productId: prodRows[0].id, customerId: cust[1].id, name: "Mehmet K.", rating: 5, body: "İlk cihazım, plaj modunda çok sakin. Kulaklık gecikmesiz.", isVerified: true, isApproved: true },
    { productId: prodRows[0].id, name: "Ayşe D.", rating: 4, body: "Hafif, gün boyu taşınıyor. Su altına giremiyor, onu bilerek alın.", isVerified: true, isApproved: true },
    { productId: prodRows[2].id, name: "Ali Ö.", rating: 5, body: "Basit ve güvenilir.", isVerified: false, isApproved: false },
    // Demo yorumlar (ana sayfa bölümünü görmek için; canlıda gerçek müşteri yorumlarıyla değişir)
    { productId: prodRows[1].id, name: "Hakan T.", rating: 5, body: "Ayarları showroomda birlikte yaptık, ilk hafta sonu sahada hiç zorlanmadım. Kargo ertesi gün elimdeydi.", isVerified: true, isApproved: true, createdAt: new Date(Date.now() - 6 * 86400000) },
    { productId: prodRows[3].id, name: "Serkan Y.", rating: 5, body: "Seri numarasını siteden sorguladım, kayıtlı çıktı. Faturası da aynı gün e-postama geldi.", isVerified: true, isApproved: true, createdAt: new Date(Date.now() - 11 * 86400000) },
    { productId: prodRows[4].id, name: "Emre A.", rating: 4, body: "Cihaz beklediğim gibi. Kulaklık kutudan çıkmadı ama WhatsApp'tan yazınca hemen çözdüler.", isVerified: true, isApproved: true, createdAt: new Date(Date.now() - 15 * 86400000) },
    { productId: prodRows[5].id, name: "Zeynep K.", rating: 5, body: "Babama hediye aldım, WhatsApp'tan cihazı tek tek anlattılar. Yeni başlayan için doğru seçim oldu.", isVerified: true, isApproved: true, createdAt: new Date(Date.now() - 20 * 86400000) },
    { productId: prodRows[7].id, name: "Murat B.", rating: 5, body: "Pointer olmadan kazı yapmak işkenceymiş, bunu aldıktan sonra süre yarıya indi.", isVerified: false, isApproved: true, createdAt: new Date(Date.now() - 27 * 86400000) },
  ]);
  await db.insert(t.productQuestions).values({ productId: prodRows[0].id, name: "Burak", contact: "burak@ornek.com", question: "Başlık kaç metreye kadar su geçirmez?" });
  await db.insert(t.returnRequests).values({ orderId: (await db.select().from(t.orders).limit(1))[0].id, customerId: cust[0].id, reason: "Beklentimi karşılamadı" });

  await db.insert(t.settings).values([
    // Demo mağaza kimliği (uydurma). Gerçek kurulumda mağaza sahibi panelden girer.
    { key: "store", value: DEMO_STORE },
    { key: "seo", value: DEMO_SEO },
    { key: "brand", value: DEMO_BRAND },
    { key: "catalog", value: DEMO_CATALOG },
    { key: "ticker", value: DEMO_TICKER },
    { key: "nav", value: { shortcuts: DEMO_NAV_SHORTCUTS } },
    { key: "payment", value: { bankAccounts: DEMO_BANK_ACCOUNTS } },
    { key: "shipping", value: DEMO_PICKUP },
    { key: "setup", value: { completed: false, completedSteps: ["store"] } },
    // seed-if-empty.ts DEMO_VERSION ile aynı olmalı
    { key: "demo", value: { version: 10 } },
    // Demo mağaza İngilizce sürümü açık gelir (yurt dışı satış denemesi için)
    { key: "i18n", value: { locales: ["tr", "en"], switcher: true } },
  ]);
  await db.insert(t.auditLogs).values({ userId: admin.id, action: "create", entity: "system", summary: "Demo verisi yüklendi" });

  // Demo etkileşim verisi (sosyal kanıt rozetlerini görmek için; canlıda gerçek ziyaretlerden oluşur)
  const hourNow = Math.floor(Date.now() / 3600_000) * 3600_000;
  const act: { productId: string; hour: Date; views: number; carts: number }[] = [];
  prodRows.slice(0, 10).forEach((p, i) => {
    for (let h = 0; h < 6; h++) act.push({ productId: p.id, hour: new Date(hourNow - h * 3 * 3600_000), views: 2 + ((i * 7 + h * 3) % 6), carts: i % 3 === 0 ? 1 : 0 });
  });
  await db.insert(t.productActivity).values(act);

  await seedContent();

  await ensureDemoGallery();
  console.log(`İngilizce içerik: ${await seedEnglish()} çeviri`);

  console.log("Bitti. Giriş: admin@derinova.local / Demo12345!  (satis@, depo@, servis@ aynı şifre)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
