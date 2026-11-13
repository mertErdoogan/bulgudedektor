import "server-only";
import { and, inArray, notInArray, sql, type SQL } from "drizzle-orm";
import { products } from "@/db/schema";
import { getSettings, type MerchSettings, type MerchWeight } from "./settings";
import type { ProductCard } from "./store";

/**
 * Vitrin önceliği (merchandising).
 *
 * Mağaza bir markanın distribütörü; satışların büyük kısmı o markadan. Raflarda (çok satanlar, yeni gelenler,
 * kategori şeritleri, benzer modeller, kategori "Önerilen" sıralaması) gösterilen ürünlerin belirli bir oranı
 * o markadan olur, diğer markalar araya serpiştirilir — hiçbir zaman tamamen gizlenmez.
 * Arama sonuçları ve kullanıcının seçtiği sıralamalar (fiyat, yeni, hafif) tarafsız kalır.
 */
export const WEIGHT_SHARE: Record<MerchWeight, number | null> = { off: null, light: 0.6, balanced: 0.75, high: 0.9 };
export const WEIGHT_LABEL: Record<MerchWeight, string> = { off: "Kapalı", light: "Hafif", balanced: "Dengeli", high: "Yüksek" };

const today = () => new Date().toISOString().slice(0, 10);

/** Süresi geçmemiş sabit ürün id'leri, girildiği sırayla */
export function activePins(m: MerchSettings): string[] {
  const t = today();
  return m.pinned.filter((p) => !p.until || p.until >= t).map((p) => p.productId);
}

export async function getMerch() {
  return (await getSettings()).merch;
}

const isFocus = (m: MerchSettings, p: ProductCard) => !!m.focusBrand && p.brandSlug === m.focusBrand;

/**
 * Bir rafı ağırlıklandırır.
 * - `candidates`: rafın kendi doğal sırası (satış, yenilik, indirim…) ile gelmiş, ihtiyaçtan fazla aday.
 * - `limit`: rafta gösterilecek ürün sayısı. Verilmezse adayların tamamı yeniden sıralanır (kategori listesi).
 * - `pins`: rafın başına alınacak sabit ürünler (adaylar arasında olanlar).
 * Diğer markalar eşit aralıklarla yerleşir: 8'lik rafta %75 → 3. ve 6. sıra.
 */
export function weigh(candidates: ProductCard[], m: MerchSettings, opts: { limit?: number; pins?: boolean } = {}): ProductCard[] {
  const limit = opts.limit ?? candidates.length;
  const share = m.focusBrand ? WEIGHT_SHARE[m.weight] : null;
  const pinIds = opts.pins === false ? [] : activePins(m);
  const pinned = pinIds.map((id) => candidates.find((c) => c.id === id)).filter((x): x is ProductCard => !!x);
  const rest = candidates.filter((c) => !pinned.includes(c));
  if (share == null) return [...pinned, ...rest].slice(0, limit);

  const slots = Math.max(0, limit - pinned.length);
  const focus = rest.filter((c) => isFocus(m, c));
  const other = rest.filter((c) => !isFocus(m, c));
  const desiredOther = (n: number) => n - Math.round(n * share);

  // Pencere: öncelikli markanın oranının korunduğu baş kısım. Öncelikli ürün yetmiyorsa pencere daralır;
  // pencerenin dışı diğer markalarla dolar (öncelikli ürünler dağılıp alta düşmez).
  let window = slots;
  if (focus.length < slots - desiredOther(slots)) window = Math.min(slots, focus.length + Math.ceil((focus.length * (1 - share)) / share));
  const otherCount = Math.min(other.length, window === slots ? desiredOther(slots) : window - focus.length);
  const otherPos = new Set<number>();
  for (let j = 1; j <= otherCount; j++) otherPos.add(Math.min(window - 1, Math.floor((j * window) / (otherCount + 1))));
  for (let i = window - 1; i >= 0 && otherPos.size < otherCount; i--) otherPos.add(i);

  const out: ProductCard[] = [];
  let fi = 0;
  let oi = 0;
  for (let i = 0; i < window; i++) {
    const pick = otherPos.has(i) ? (other[oi++] ?? focus[fi++]) : (focus[fi++] ?? other[oi++]);
    if (!pick) break;
    out.push(pick);
  }
  // Pencereden sonrası: önce kalan öncelikliler, sonra diğerleri (sınırlı raflarda kesilir)
  out.push(...focus.slice(fi), ...other.slice(oi));
  return [...pinned, ...out].slice(0, opts.limit ?? undefined);
}

/**
 * Raf için aday havuzu: doğal sıralı sonuçlar + (öncelikli marka yeterince yoksa) rafın koşuluna uyan
 * öncelikli marka ürünleri + rafın koşuluna uyan sabit ürünler. Böylece "son 60 günde az Minelab satıldı"
 * diye raf boşalmaz; "Fırsatlar" rafına da indirimde olmayan bir ürün sabitlenemez.
 * `fetch(cond, n)`: rafın kendi koşulu VE cond ile, rafın kendi sırasıyla n ürün getirir.
 */
export async function candidatePool(natural: ProductCard[], m: MerchSettings, fetch: (cond: SQL, n: number) => Promise<ProductCard[]>, limit: number): Promise<ProductCard[]> {
  const pool = [...natural];
  const seen = new Set(pool.map((p) => p.id));
  const add = (list: ProductCard[]) => {
    for (const p of list) if (!seen.has(p.id)) (seen.add(p.id), pool.push(p));
  };
  const pins = activePins(m).filter((id) => !seen.has(id));
  if (pins.length) add(await fetch(inArray(products.id, pins), pins.length));
  const share = m.focusBrand ? WEIGHT_SHARE[m.weight] : null;
  if (share != null) {
    const have = pool.filter((p) => p.brandSlug === m.focusBrand).length;
    const need = Math.ceil(limit * share) - have;
    // Havuzda olmayanlar arasından (yoksa aynı ürünler gelip elenir, raf eksik kalır)
    if (need > 0) add(await fetch(and(focusBrandCond(m.focusBrand), seen.size ? notInArray(products.id, [...seen]) : undefined)!, need + 2));
  }
  return pool;
}

export const focusBrandCond = (slug: string) => sql`exists (select 1 from brands fb where fb.id = ${products.brandId} and fb.slug = ${slug})`;

/** Kısa yol: doğal sorgu + havuz + ağırlık */
export async function weighed(natural: (n: number) => Promise<ProductCard[]>, fetch: (cond: SQL, n: number) => Promise<ProductCard[]>, limit: number, opts: { pins?: boolean } = {}) {
  const m = await getMerch();
  const nat = await natural(limit * 2);
  const pool = await candidatePool(nat, opts.pins === false ? { ...m, pinned: [] } : m, fetch, limit);
  return weigh(pool, m, { limit, pins: opts.pins });
}

/** Öncelikli markanın vitrin görselleri (marka kartı için): öne çıkan ve pahalı modeller önce */
export async function focusThumbs(m: MerchSettings, n = 4): Promise<string[]> {
  if (!m.focusBrand) return [];
  const { cardQuery } = await import("./store");
  const { and, desc, eq } = await import("drizzle-orm");
  const rows = await cardQuery().where(and(eq(products.status, "ACTIVE"), focusBrandCond(m.focusBrand))).orderBy(desc(products.isFeatured), desc(products.price)).limit(n * 2);
  return rows.map((r) => r.image).filter((x): x is string => !!x).slice(0, n);
}

/**
 * Banner altı kartlar için öncelikli markanın en yeni cihazları.
 * Cihaz = teknoloji alanı dolu ürün (başlık, kulaklık gibi aksesuarlar girmez).
 * Sıra: sabitlenmiş (süresi geçmemiş) → "Yeni" rozetli → en son eklenen. Stokta olmayanlar sona.
 */
export async function latestFocus(m: MerchSettings, n = 3): Promise<ProductCard[]> {
  if (!m.focusBrand) return [];
  const { cardQuery } = await import("./store");
  const { and, desc, eq, isNotNull } = await import("drizzle-orm");
  const rows = await cardQuery()
    .where(and(eq(products.status, "ACTIVE"), isNotNull(products.technology), focusBrandCond(m.focusBrand)))
    .orderBy(sql`(${products.stock} > 0 or ${products.allowBackorder}) desc`, sql`(coalesce(${products.badges}, '{}') && array['Yeni']) desc`, desc(products.createdAt))
    .limit(n + 6);
  const pins = activePins(m);
  const list = rows as unknown as ProductCard[];
  const pinned = pins.map((id) => list.find((r) => r.id === id)).filter((x): x is ProductCard => !!x);
  return [...pinned, ...list.filter((r) => !pinned.includes(r))].slice(0, n);
}
