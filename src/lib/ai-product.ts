import { fillNiche } from "./i18n/dict";
import { syncNiche } from "./i18n/server";
import "server-only";
import { aiStructured } from "./ai";

export type AiProductInput = {
  name: string;
  brand?: string;
  category?: string;
  technology?: string;
  waterproof?: string;
  experience?: string;
  weightKg?: string;
  warrantyMonths?: string;
  specs?: { key: string; value: string }[];
  boxContents?: string;
  shortDescription?: string;
  description?: string;
  idealFor?: string;
  notFor?: string;
  /** Personelin eklediği bilgi: öne çıkarılacak noktalar, hedef müşteri vb. */
  note?: string;
};

export type AiProductParts = ("tr" | "sales" | "en")[];

export type AiProductResult = {
  shortDescription?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  idealFor?: string[];
  notFor?: string[];
  en?: { name: string; slug: string; shortDescription: string; description: string; seoTitle: string; seoDescription: string };
};

const SYSTEM_TPL = `Sen bir {tür} mağazasının deneyimli içerik editörüsün. Türkçe ürün içerikleri yazıyorsun; istenirse İngilizcesini de hazırlıyorsun.
Kurallar:
- Yalnızca sana verilen bilgilere dayan. Teknik özellik, sayı, derinlik, frekans, ağırlık, garanti süresi UYDURMA. Bilgi yoksa o konudan hiç bahsetme.
- Abartma: "en iyi", "kesin bulur", "garantili sonuç" gibi iddialar yok. Ürünün ne işe yaradığını, kime uygun olduğunu dürüstçe anlat.
- Fiyat, kampanya, stok veya tarih yazma (değişir).
- Yasal konularda (define arama izni vb.) iddiada bulunma.
- Emoji kullanma. Doğal, sade, güven veren bir dil kullan; "sen" diye hitap et.
- Detaylı açıklama Markdown: 2–4 kısa bölüm (## başlık), kısa paragraflar ve gerektiğinde madde listesi. 150–300 kelime.
- Kısa açıklama 1–2 cümle, en fazla 200 karakter.
- SEO başlığı en fazla 60 karakter, marka + model + ürün türü içersin. SEO açıklaması 140–155 karakter, tıklamaya teşvik etsin ama abartmasın.
- "Kimler için ideal" ve "Bunu bekleme" maddeleri kısa (en fazla 90 karakter), somut ve dürüst olsun; 3–5 madde.
- İngilizce metin birebir çeviri değil, doğal İngilizce (İngiliz yazımı: colour, metre) olsun; aynı kurallar geçerli. Türkiye'ye özel ifadeleri (ör. TL, taksit) çıkar. İngilizce slug yalnızca küçük harf, rakam ve tire.`;

const str = { type: "string" };
const list = { type: "array", items: { type: "string" }, maxItems: 6 };

function describe(p: AiProductInput) {
  const lines = [
    `Ürün adı: ${p.name}`,
    p.brand && `Marka: ${p.brand}`,
    p.category && `Kategori: ${p.category}`,
    p.technology && `Teknoloji: ${p.technology}`,
    p.waterproof && `Su geçirmezlik: ${p.waterproof}`,
    p.experience && `Kimin için (deneyim): ${p.experience}`,
    p.weightKg && `Ağırlık: ${p.weightKg} kg`,
    p.warrantyMonths && `Garanti: ${p.warrantyMonths} ay`,
    p.specs?.length ? `Teknik özellikler:\n${p.specs.map((s) => `- ${s.key}: ${s.value}`).join("\n")}` : "",
    p.boxContents && `Kutu içeriği:\n${p.boxContents}`,
    p.shortDescription && `Mevcut kısa açıklama: ${p.shortDescription}`,
    p.description && `Mevcut detaylı açıklama:\n${p.description}`,
    p.idealFor && `Mevcut "kimler için ideal":\n${p.idealFor}`,
    p.notFor && `Mevcut "bunu bekleme":\n${p.notFor}`,
    p.note && `Editörün notu (öncelikli dikkate al):\n${p.note}`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** Ürün içeriği önerisi üretir. Sonuç forma "öneri" olarak gelir; personel kontrol edip kaydeder. */
export async function generateProductContent(p: AiProductInput, parts: AiProductParts): Promise<AiProductResult> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  if (parts.includes("tr")) {
    Object.assign(properties, { shortDescription: str, description: str, seoTitle: str, seoDescription: str });
    required.push("shortDescription", "description", "seoTitle", "seoDescription");
  }
  if (parts.includes("sales")) {
    Object.assign(properties, { idealFor: list, notFor: list });
    required.push("idealFor", "notFor");
  }
  if (parts.includes("en")) {
    properties.en = {
      type: "object",
      properties: { name: str, slug: str, shortDescription: str, description: str, seoTitle: str, seoDescription: str },
      required: ["name", "slug", "shortDescription", "description", "seoTitle", "seoDescription"],
    };
    required.push("en");
  }
  const want = [
    parts.includes("tr") && "Türkçe kısa açıklama, detaylı açıklama, SEO başlığı ve SEO açıklaması",
    parts.includes("sales") && `"Kimler için ideal" ve "Bunu bekleme" maddeleri`,
    parts.includes("en") && "İngilizce ad, slug, kısa açıklama, detaylı açıklama, SEO başlığı ve SEO açıklaması (Türkçe içerik yazıyorsan onunla tutarlı olsun)",
  ].filter(Boolean);
  const r = await aiStructured<AiProductResult>({
    system: (await syncNiche(), fillNiche(SYSTEM_TPL)),
    prompt: `Aşağıdaki ürün için şunları yaz: ${want.join("; ")}.\n\n${describe(p)}`,
    tool: { name: "product_content", description: "Ürün sayfası içeriği", input_schema: { type: "object", properties, required } },
    maxTokens: parts.includes("en") ? 5000 : 3000,
  });
  // Biçim düzeltmeleri: uzunluk sınırları ve slug
  const cut = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
  if (r.seoTitle) r.seoTitle = cut(r.seoTitle, 70);
  if (r.seoDescription) r.seoDescription = cut(r.seoDescription, 170);
  if (r.shortDescription) r.shortDescription = cut(r.shortDescription, 300);
  if (r.idealFor) r.idealFor = r.idealFor.filter(Boolean).slice(0, 6);
  if (r.notFor) r.notFor = r.notFor.filter(Boolean).slice(0, 6);
  if (r.en?.slug)
    r.en.slug = r.en.slug
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  return r;
}
