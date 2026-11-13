import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { getFaqs, getGlossary, getPublishedPosts } from "./content";
import { abs, real, sameAs, siteUrl } from "./seo";
import { getSettings } from "./settings";
import { EXPERIENCE_LABEL, TECH_LABEL, WATERPROOF_LABEL, formatTL } from "./utils";

/**
 * llms.txt (https://llmstxt.org) — ChatGPT, Claude, Perplexity gibi AI asistanların
 * siteyi hızlı ve doğru özetlemesi için düz Markdown "kimlik kartı".
 */
export async function buildLlms(full: boolean) {
  const [s, cats, brs, posts, faq, terms] = await Promise.all([
    getSettings(),
    db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder)),
    db.select().from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.sortOrder)),
    getPublishedPosts(),
    getFaqs({ general: true }),
    full ? getGlossary() : Promise.resolve([]),
  ]);
  const prods = await db.query.products.findMany({
    where: eq(products.status, "ACTIVE"),
    with: { brand: true, category: true, images: { orderBy: asc(productImages.sortOrder), limit: 1 } },
    orderBy: [desc(products.isFeatured), asc(products.price)],
  });
  const st = s.store;
  const L: string[] = [];
  L.push(`# ${st.name}`, "", `> ${s.seo.aboutForAi || s.seo.description}`, "");
  L.push("## Temel bilgiler", "");
  L.push(`- Web sitesi: ${siteUrl()}`);
  if (st.phone) L.push(`- Telefon: ${st.phone}`);
  if (st.whatsapp) L.push(`- WhatsApp: https://wa.me/${st.whatsapp}`);
  if (st.email) L.push(`- E-posta: ${st.email}`);
  if (real(st.address)) L.push(`- Showroom: ${st.address}`);
  if (st.workingHours) L.push(`- Çalışma saatleri: ${st.workingHours}`);
  if (real(st.legalName)) L.push(`- Şirket: ${st.legalName}${st.etbis ? ` (ETBİS: ${st.etbis})` : ""}`);
  const so = sameAs(s);
  if (so.length) L.push(`- Resmi profiller: ${so.join(", ")}`);
  L.push("");
  L.push("## Satış koşulları", "");
  L.push(`- Tüm ürünler orijinal, faturalı ve yetkili distribütör garantilidir (genellikle 24 ay). Seri numarası ${abs("/seri-no")} adresinden sorgulanabilir.`);
  L.push(`- Kargo: ${s.shipping.flatRate === 0 ? "ücretsiz" : s.shipping.freeThreshold ? `${formatTL(s.shipping.freeThreshold)} üzeri ücretsiz, altı ${formatTL(s.shipping.flatRate)}` : formatTL(s.shipping.flatRate)}; tahmini teslim ${s.shipping.deliveryEstimate}; saat ${s.shipping.sameDayCutoff}'e kadar verilen stoklu siparişler aynı gün kargoda.`);
  L.push(`- Ödeme: kredi/banka kartı (iyzico, 3D Secure), ${s.payment.maxInstallment} taksite kadar${s.payment.noInterestInstallments > 1 ? `, ${s.payment.noInterestInstallments} taksite kadar vade farksız` : ""}${s.payment.transferEnabled ? `; havale/EFT${s.payment.transferDiscountPct ? ` (%${s.payment.transferDiscountPct} indirim)` : ""}` : ""}.`);
  L.push("- İade: 14 gün içinde koşulsuz iade, ücretsiz iade kargo kodu.");
  L.push(`- Satış öncesi: ücretsiz uzman danışmanlığı (WhatsApp ve telefon), 6 soruluk seçim sihirbazı (${abs("/sihirbaz")}).`);
  L.push(`- Satış sonrası: kurulum eğitimi ve teknik servis takibi (${abs("/servis")}).`);
  L.push("- Yasal not: Türkiye'de dedektör satın almak ve bulundurmak serbesttir; arama yapmak ise 2863 sayılı Kanun kapsamında izne tabidir. Kullanıcıların yerel mevzuatı ve ilgili kurumları kontrol etmesi önerilir.", "");

  L.push("## Kategoriler", "");
  for (const c of cats) {
    const items = prods.filter((p) => p.categoryId === c.id);
    const prices = items.map((p) => p.price);
    L.push(`- [${c.name}](${abs(`/kategori/${c.slug}`)}): ${c.shortText || c.description || ""}${prices.length ? ` (${items.length} model, ${Math.min(...prices) === Math.max(...prices) ? formatTL(prices[0]) : `${formatTL(Math.min(...prices))} – ${formatTL(Math.max(...prices))}`})` : ""}`.trim());
  }
  L.push("", "## Markalar", "");
  for (const b of brs) L.push(`- [${b.name}](${abs(`/marka/${b.slug}`)})${b.description ? `: ${b.description}` : ""}`);

  L.push("", full ? "## Ürün kataloğu (güncel fiyat ve stok)" : "## Öne çıkan ürünler", "");
  for (const p of full ? prods : prods.slice(0, 15)) {
    const n = p.brand && !p.name.startsWith(p.brand.name) ? `${p.brand.name} ${p.name}` : p.name;
    const avail = p.stock > 0 ? "stokta" : p.allowBackorder ? "siparişle" : "stokta yok";
    L.push(`### [${n}](${abs(`/urun/${p.slug}`)})`, "");
    L.push(`- Fiyat: ${formatTL(p.price)} (${avail}) · Garanti: ${p.warrantyMonths} ay · Kategori: ${p.category?.name ?? "-"}`);
    const facts = [p.technology ? `Teknoloji: ${TECH_LABEL[p.technology]}` : null, p.waterproof ? `Su: ${WATERPROOF_LABEL[p.waterproof]}` : null, p.weightKg ? `Ağırlık: ${p.weightKg} kg` : null, p.experience ? `Seviye: ${EXPERIENCE_LABEL[p.experience]}` : null].filter(Boolean);
    if (facts.length) L.push(`- ${facts.join(" · ")}`);
    if (p.shortDescription) L.push(`- ${p.shortDescription}`);
    if (full) {
      if (p.idealFor.length) L.push(`- İdeal: ${p.idealFor.join("; ")}`);
      if (p.notFor.length) L.push(`- Dikkat: ${p.notFor.join("; ")}`);
      for (const sp of p.specs.slice(0, 20)) L.push(`  - ${sp.key}: ${sp.value}`);
    }
    L.push("");
  }

  if (posts.length) {
    L.push("## Rehberler", "");
    for (const p of posts) L.push(`- [${p.title}](${abs(`/blog/${p.slug}`)})${p.excerpt ? `: ${p.excerpt}` : ""}`);
    L.push("");
  }
  if (faq.length) {
    L.push("## Sık sorulan sorular", "");
    for (const f of full ? faq : faq.slice(0, 10)) L.push(`### ${f.question}`, "", f.answer, "");
    if (!full) L.push(`Tümü: ${abs("/sss")}`, "");
  }
  if (full && terms.length) {
    L.push("## Sözlük", "");
    for (const t of terms) L.push(`- **${t.question}**: ${t.answer}`);
    L.push("");
  }
  L.push("## Diğer", "");
  L.push(`- [Tüm ürünler](${abs("/urunler")})`, `- [Sık sorulan sorular](${abs("/sss")})`, `- [Dedektör sözlüğü](${abs("/sozluk")})`, `- [İletişim](${abs("/iletisim")})`);
  if (!full) L.push(`- [Ayrıntılı sürüm (tüm katalog, SSS ve sözlük)](${abs("/llms-full.txt")})`);
  L.push("", `Son güncelleme: ${new Date().toISOString().slice(0, 10)}`);
  return L.join("\n");
}
