/**
 * arenadedektor.com (Efortek) → yeni site içe aktarma.
 *
 *   npm run import:arena                 # tüm ürünleri, görselleri ve blog yazılarını aktarır
 *   npm run import:arena -- --dry        # sadece okur, data/arena-snapshot.json'a yazar (veritabanına dokunmaz)
 *   npm run import:arena -- --from data/arena-snapshot.json   # önceden alınmış dosyadan aktarır
 *   npm run import:arena -- --hotlink    # görselleri indirmez, eski sitedeki adresini kullanır (geçici)
 *   npm run import:arena -- --limit 5    # deneme: ilk 5 ürün
 *   npm run import:arena -- --archive-demo   # demo ürünleri arşive alır (siparişler etkilenmez)
 *   npm run import:arena -- --banners-only   # yalnızca ana sayfa slider banner'larını aktarır
 *                                            # (eski banner'lar pasife alınır, görseller indirilip renk paleti hesaplanır)
 *
 * Tekrar çalıştırılabilir: ürünler adresine (slug) göre güncellenir, yeni olanlar eklenir.
 * Fiyat her çalıştırmada güncellenir; stok yalnızca ilk eklemede ya da --update-stock ile yazılır
 * (Efortek sadece "var/yok" gösterdiği için gerçek stok adetleri panelden girilmelidir).
 */
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "../src/db";
import * as t from "../src/db/schema";
import { paletteFromUrl } from "../src/lib/palette-core";
import { putObject } from "../src/lib/storage-core";
import { CATEGORY_PRIORITY, CATEGORY_TREE, CATEGORY_USE_CASE, LEGACY_REDIRECTS, OLD_BRAND_CATEGORY, OLD_CATEGORY_TO_NEW } from "./lib/arena-map";
import { displayName, guessSpecs, parseCategoryPage, parsePost, parseProduct, parseSitemap, type ArenaPost, type ArenaProduct, parseHomeBanners, type ArenaBanner } from "./lib/arena-parse";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const BASE = (opt("base") ?? "https://www.arenadedektor.com").replace(/\/$/, "");
const LIMIT = Number(opt("limit") ?? 0) || Infinity;
const UA = "Mozilla/5.0 (compatible; ArenaImporter/1.0; +site-migration)";

type Snapshot = { takenAt: string; base: string; products: (ArenaProduct & { oldCategories: string[] })[]; posts: ArenaPost[]; banners?: ArenaBanner[] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string, tries = 3): Promise<string> {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,application/xml" }, signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.text();
      if (r.status === 404) return "";
    } catch {}
    await sleep(800 * (i + 1));
  }
  throw new Error(`İndirilemedi: ${url}`);
}

async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let k = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (k < items.length) {
        const i = k++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function crawlBanners(): Promise<ArenaBanner[]> {
  console.log(`→ ${BASE}/ ana sayfa banner'ları okunuyor`);
  const b = parseHomeBanners(await get(`${BASE}/`), BASE);
  console.log(`  ${b.length} banner bulundu`);
  return b;
}

async function crawl(): Promise<Snapshot> {
  const banners = await crawlBanners();
  console.log(`→ ${BASE}/sitemap.xml okunuyor`);
  const locs = parseSitemap(await get(`${BASE}/sitemap.xml`));
  const productPaths = locs.filter((l) => l.startsWith("/urun/")).slice(0, LIMIT);
  const catPaths = locs.filter((l) => l.startsWith("/kategori/"));
  const postPaths = locs.filter((l) => l.startsWith("/blog/") && !l.startsWith("/blog/kategori/"));

  console.log(`→ ${catPaths.length} kategori taranıyor (ürün ↔ kategori eşlemesi)`);
  const catOf = new Map<string, string[]>();
  for (const c of catPaths) {
    const slug = c.replace("/kategori/", "");
    for (let p = 1; p <= 20; p++) {
      const html = await get(`${BASE}${c}?p=${p}`);
      const { links, maxPage } = parseCategoryPage(html);
      for (const l of links) catOf.set(l, [...new Set([...(catOf.get(l) ?? []), slug])]);
      if (p >= maxPage || !links.length) break;
    }
  }

  console.log(`→ ${productPaths.length} ürün sayfası okunuyor`);
  const products = (
    await pool(productPaths, 4, async (path, i) => {
      const html = await get(`${BASE}${path}`);
      const p = html ? parseProduct(html, path, BASE) : null;
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${productPaths.length}`);
      return p ? { ...p, oldCategories: catOf.get(path) ?? [] } : null;
    })
  ).filter((x): x is NonNullable<typeof x> => !!x);

  console.log(`→ ${postPaths.length} blog yazısı okunuyor`);
  const posts = (await pool(postPaths, 3, async (path) => parsePost(await get(`${BASE}${path}`), path, BASE))).filter((x): x is ArenaPost => !!x);
  return { takenAt: new Date().toISOString(), base: BASE, products, posts, banners };
}

/** Ana sayfa banner'ları: aynı başlıklı banner güncellenir, diğer büyük slider banner'ları pasife alınır. */
async function importBanners(list: ArenaBanner[]) {
  if (!list.length) return console.log("  ! banner bulunamadı, mevcutlar korunuyor");
  const existing = await db.select().from(t.banners).where(eq(t.banners.placement, "HERO"));
  const keep: string[] = [];
  for (const [i, b] of list.entries()) {
    const imageUrl = await storeImage(b.image);
    const palette = await paletteFromUrl(imageUrl);
    const values = { title: b.title, imageUrl, linkUrl: b.link, showText: false, placement: "HERO" as const, sortOrder: i, isActive: true, palette };
    const same = existing.find((e) => e.title === b.title);
    if (same) {
      await db.update(t.banners).set(values).where(eq(t.banners.id, same.id));
      keep.push(same.id);
    } else {
      const [row] = await db.insert(t.banners).values(values).returning({ id: t.banners.id });
      keep.push(row.id);
    }
  }
  const off = existing.filter((e) => !keep.includes(e.id) && e.isActive);
  if (off.length) await db.update(t.banners).set({ isActive: false }).where(inArray(t.banners.id, off.map((e) => e.id)));
  console.log(`✓ Banner: ${list.length} aktarıldı${off.length ? `, ${off.length} eski banner pasife alındı (panelden silinebilir)` : ""}`);
}

const slugify = (s: string) =>
  s
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]!)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const imageCache = new Map<string, string>();
async function storeImage(url: string): Promise<string> {
  if (flag("hotlink")) return url;
  const hit = imageCache.get(url);
  if (hit) return hit;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(String(r.status));
    const mime = r.headers.get("content-type")?.split(";")[0] || "image/webp";
    const saved = await putObject(Buffer.from(await r.arrayBuffer()), mime);
    imageCache.set(url, saved.url);
    return saved.url;
  } catch (e) {
    console.warn(`  ! görsel indirilemedi (${url}): ${e instanceof Error ? e.message : e} — eski adres kullanılıyor`);
    return url;
  }
}

function pickCategory(p: ArenaProduct & { oldCategories: string[] }) {
  const mapped = [...new Set(p.oldCategories.map((c) => OLD_CATEGORY_TO_NEW[c]).filter(Boolean))];
  const primary = CATEGORY_PRIORITY.find((c) => mapped.includes(c));
  if (primary) return { primary, all: mapped };
  const n = p.name.toLocaleLowerCase("tr");
  const guess = /pointer|pro.?find|pinpointer|accupoint/.test(n)
    ? "pointer"
    : /başlık|bobin|coil|\bdd\b|inç|inc\b/.test(n)
      ? "dedektor-basliklari"
      : /kulaklık/.test(n)
        ? "dedektor-kulakliklari"
        : /batarya|şarj|pil|kablo/.test(n)
          ? "batarya-ve-sarj"
          : "define-ve-sikke";
  return { primary: guess, all: [guess] };
}

async function run() {
  if (flag("banners-only")) {
    const list = await crawlBanners();
    if (flag("dry")) return console.log(JSON.stringify(list, null, 1));
    return importBanners(list);
  }
  let snap: Snapshot;
  const from = opt("from");
  if (from) snap = JSON.parse(await readFile(from, "utf8"));
  else {
    snap = await crawl();
    await mkdir("data", { recursive: true });
    await writeFile("data/arena-snapshot.json", JSON.stringify(snap, null, 1));
    console.log(`✓ data/arena-snapshot.json yazıldı (${snap.products.length} ürün, ${snap.posts.length} yazı)`);
  }
  if (flag("dry")) return;

  // 1) Kategoriler
  const catId = new Map<string, string>();
  for (const c of CATEGORY_TREE.filter((x) => !x.parent)) {
    const [row] = await db.insert(t.categories).values({ name: c.name, slug: c.slug, shortText: c.shortText, sortOrder: c.sortOrder }).onConflictDoUpdate({ target: t.categories.slug, set: { isActive: true } }).returning({ id: t.categories.id });
    catId.set(c.slug, row.id);
  }
  for (const c of CATEGORY_TREE.filter((x) => x.parent)) {
    const [row] = await db
      .insert(t.categories)
      .values({ name: c.name, slug: c.slug, shortText: c.shortText, sortOrder: c.sortOrder, parentId: catId.get(c.parent!) })
      .onConflictDoUpdate({ target: t.categories.slug, set: { isActive: true, parentId: catId.get(c.parent!) } })
      .returning({ id: t.categories.id });
    catId.set(c.slug, row.id);
  }

  // 2) Markalar
  const brandId = new Map<string, string>();
  const brandNames = [...new Set(snap.products.map((p) => p.brand).filter(Boolean))] as string[];
  for (const [i, name] of brandNames.entries()) {
    const slug = slugify(name);
    const pretty = name.length <= 3 ? name.toUpperCase() : name === name.toUpperCase() ? name[0] + name.slice(1).toLowerCase() : name;
    const [row] = await db.insert(t.brands).values({ name: pretty, slug, sortOrder: 10 + i }).onConflictDoUpdate({ target: t.brands.slug, set: { isActive: true } }).returning({ id: t.brands.id });
    brandId.set(name, row.id);
  }

  // 3) Ürünler
  const existing = new Map((await db.select({ id: t.products.id, slug: t.products.slug, sku: t.products.sku }).from(t.products)).map((r) => [r.slug, r]));
  const usedSku = new Set((await db.select({ sku: t.products.sku }).from(t.products)).map((r) => r.sku));
  let added = 0;
  let updated = 0;
  const warnings: string[] = [];
  for (const [i, p] of snap.products.entries()) {
    const { primary, all } = pickCategory(p);
    const accessory = ["pointer", "dedektor-basliklari", "baslik-kapaklari", "dedektor-kulakliklari", "batarya-ve-sarj", "baslik-ve-aksesuar"].includes(primary);
    const spec = guessSpecs(`${p.name} ${p.descriptionMd}`, accessory && primary !== "pointer");
    const prev = existing.get(p.slug);
    let sku = p.code?.trim() || p.slug;
    if (!prev && usedSku.has(sku)) sku = `${sku}-${p.slug.slice(0, 20)}`;
    usedSku.add(sku);
    const description = (p.gift ? `> **Kampanya:** ${p.gift}\n\n` : "") + p.descriptionMd;
    const base = {
      name: displayName(p.name, p.brand),
      brandId: p.brand ? brandId.get(p.brand) : null,
      categoryId: catId.get(primary) ?? null,
      price: p.price,
      shortDescription: p.metaDescription,
      description,
      seoTitle: p.title && p.title !== p.name ? p.title : p.name,
      seoDescription: p.metaDescription,
      useCases: all.map((c) => CATEGORY_USE_CASE[c]).filter(Boolean),
      badges: p.gift ? ["Hediyeli"] : [],
      updatedAt: new Date(),
    };
    if (!p.price) warnings.push(`${p.slug}: fiyat okunamadı`);
    if (prev) {
      await db
        .update(t.products)
        .set({ ...base, ...(flag("update-stock") ? { stock: p.inStock ? 5 : 0 } : {}), status: "ACTIVE" })
        .where(eq(t.products.id, prev.id));
      updated++;
      if (flag("refresh-images")) await db.delete(t.productImages).where(eq(t.productImages.productId, prev.id));
      else continue;
    }
    const pid =
      prev?.id ??
      (
        await db
          .insert(t.products)
          .values({
            ...base,
            slug: p.slug,
            sku,
            status: "ACTIVE",
            stock: p.inStock ? 5 : 0,
            technology: spec.technology,
            waterproof: spec.waterproof,
            trackSerial: !accessory,
            sameDayShipping: true,
            sortOrder: i,
            createdAt: new Date(Date.now() - (p.isNew ? 7 : 120) * 86400000),
          })
          .returning({ id: t.products.id })
      )[0].id;
    if (!prev) added++;
    const imgs = await pool(p.images.slice(0, 12), 3, (u) => storeImage(u));
    if (imgs.length) await db.insert(t.productImages).values(imgs.map((url, k) => ({ productId: pid, url, alt: p.name, sortOrder: k })));
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${snap.products.length} ürün yazıldı`);
  }

  // 4) Blog yazıları (taslak olarak; yayınlamadan önce gözden geçirilmeli)
  let postsAdded = 0;
  for (const post of snap.posts) {
    const cover = post.cover ? await storeImage(post.cover) : null;
    const r = await db
      .insert(t.posts)
      .values({
        title: post.title,
        slug: post.slug,
        excerpt: post.metaDescription,
        content: post.contentMd,
        coverImage: cover,
        category: "Rehber",
        status: flag("publish-posts") ? "PUBLISHED" : "DRAFT",
        publishedAt: post.date ?? new Date(),
        seoDescription: post.metaDescription,
      })
      .onConflictDoNothing({ target: t.posts.slug })
      .returning({ id: t.posts.id });
    postsAdded += r.length;
  }

  // 5) Eski adres yönlendirmeleri
  if (LEGACY_REDIRECTS.length) await db.insert(t.redirects).values(LEGACY_REDIRECTS.map(([fromPath, toPath]) => ({ fromPath, toPath }))).onConflictDoNothing();

  // 6) Ana sayfa banner'ları
  if (snap.banners) await importBanners(snap.banners);

  // 7) Demo ürünleri arşive al (isteğe bağlı)
  if (flag("archive-demo")) {
    const keep = snap.products.map((p) => p.slug);
    const r = await db.update(t.products).set({ status: "ARCHIVED" }).where(and(notInArray(t.products.slug, keep), eq(t.products.status, "ACTIVE"))).returning({ id: t.products.id });
    console.log(`✓ ${r.length} demo ürün arşive alındı`);
  }

  const outOfStock = snap.products.filter((p) => !p.inStock).length;
  console.log(`\n✓ Ürün: ${added} eklendi, ${updated} güncellendi · Blog: ${postsAdded} taslak · Yönlendirme: ${LEGACY_REDIRECTS.length}`);
  console.log(`  Stokta olanlara geçici olarak 5 adet yazıldı, ${outOfStock} ürün tükendi olarak aktarıldı. Gerçek stokları panelden (Stok) girin.`);
  if (warnings.length) console.log(`  Uyarılar:\n   - ${warnings.join("\n   - ")}`);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.products).where(inArray(t.products.slug, snap.products.map((p) => p.slug)));
  console.log(`  Veritabanında eşleşen ürün: ${n}`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
