/**
 * arenadedektor.com (Efortek) sayfa ayrıştırıcıları. Saf fonksiyonlar: HTML alır, veri döndürür.
 * Seçiciler 11.11.2026 tarihli site yapısına göre yazıldı; site teması değişirse burası güncellenmeli.
 */
import * as cheerio from "cheerio";
import TurndownService from "turndown";

export type ArenaProduct = {
  path: string; // /urun/...
  slug: string;
  name: string;
  brand: string | null;
  code: string | null;
  price: number;
  inStock: boolean;
  isNew: boolean;
  gift: string | null;
  images: string[]; // mutlak adres
  title: string;
  metaDescription: string | null;
  descriptionMd: string;
};

export type ArenaPost = { path: string; slug: string; title: string; metaDescription: string | null; cover: string | null; date: Date | null; contentMd: string };

const GENERIC_META = /Arena Dedektör'de Minelab, XP, Nokta ve Garrett dedektörleri/i;
const GENERIC_INTRO = /Güvenli Alışveriş\s*&(amp;)?\s*Orijinal Ürün Garantisi/i;

export const parseTL = (s: string | null | undefined) => {
  if (!s) return null;
  const m = s.replace(/\s/g, "").match(/[\d.]+,\d{2}|\d[\d.]*/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

function turndown() {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", emDelimiter: "*" });
  td.remove(["script", "style", "iframe", "form", "button", "input"]);
  // <details><summary>Başlık</summary>…</details> → ### Başlık + içerik
  td.addRule("details", {
    filter: (n) => n.nodeName === "DETAILS",
    replacement: (content) => `\n\n${content}\n\n`,
  });
  td.addRule("summary", {
    filter: (n) => n.nodeName === "SUMMARY",
    replacement: (content) => `\n\n### ${content.replace(/\*\*/g, "").trim()}\n\n`,
  });
  // Tablo: basit Markdown tablosu
  td.addRule("table", {
    filter: "table",
    replacement: (_c, node) => {
      const rows = Array.from((node as HTMLTableElement).querySelectorAll("tr")).map((tr) =>
        Array.from(tr.querySelectorAll("th,td")).map((c) => (c.textContent ?? "").replace(/\s+/g, " ").replace(/\|/g, "/").trim()),
      );
      if (!rows.length) return "";
      const w = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]) => [...r, ...Array(w - r.length).fill("")];
      const [head, ...rest] = rows.map(pad);
      return `\n\n| ${head.join(" | ")} |\n| ${head.map(() => "---").join(" | ")} |\n${rest.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n\n`;
    },
  });
  // Görselleri metinden çıkar (galeri ayrıca alınıyor)
  td.addRule("img", { filter: "img", replacement: () => "" });
  return td;
}

function cleanMd(md: string) {
  return md
    .replace(/ /g, " ")
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const abs = (base: string, u: string) => (u.startsWith("http") ? u : `${base.replace(/\/$/, "")}${u.startsWith("/") ? "" : "/"}${u}`);

export function parseProduct(html: string, path: string, base: string): ArenaProduct | null {
  const $ = cheerio.load(html);
  const name = $(".baslik h1").first().text().trim() || $("h1").first().text().trim();
  if (!name) return null;
  const km = $(".kod-marka");
  const brand = km.find("a").first().text().trim() || null;
  let code: string | null = null;
  km.find("span").each((_, el) => {
    if (/Kod:/.test($(el).text())) code = $(el).next("span").text().trim() || null;
  });
  const price = parseTL($(".fiyatlar .fiyat-son").first().text()) ?? 0;
  const outOfStock = /Tükendi/i.test($(".fotobardetay").first().text()) || $('a[href*="/listeler/stok/ekle"]').length > 0;
  const hasCart = $(".btn-sepete-ekle-detay").length > 0;
  const isNew = $(".nitelik-sol .badge").toArray().some((b) => /yeni/i.test($(b).text()));
  let gift: string | null = null;
  $(".alert.alert-light").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (/KAMPANYA/i.test(t)) gift = t.replace(/^KAMPANYA\s*!?\s*/i, "").replace(/Sepete dahil et.*$/i, "").trim();
  });
  const images: string[] = [];
  const firstGallery = $(".swiperFoto").first();
  firstGallery.find("a.foto-zoom").each((_, a) => {
    const href = $(a).attr("href");
    if (href) images.push(abs(base, href));
  });
  if (!images.length) firstGallery.find("img").each((_, i) => { const s = $(i).attr("src"); if (s) images.push(abs(base, s)); });

  const desc = $("#navs-top-urun").first();
  desc.find("p").first().each((_, p) => { if (GENERIC_INTRO.test($(p).text())) $(p).remove(); });
  desc.find(".clearfix").remove();
  const descriptionMd = cleanMd(turndown().turndown(desc.html() ?? ""));
  const meta = $('meta[name="description"]').attr("content")?.trim() || null;
  const title = $("title").text().replace(/\s*-\s*ARENA DEDEKTÖR\s*$/i, "").trim();
  const slug = path.replace(/^\/urun\//, "").replace(/\/$/, "");
  return {
    path,
    slug,
    name,
    brand,
    code,
    price,
    inStock: !outOfStock && hasCart,
    isNew,
    gift,
    images: [...new Set(images)],
    title,
    metaDescription: meta && !GENERIC_META.test(meta) ? meta : null,
    descriptionMd,
  };
}

/** Kategori listesindeki ürün adresleri ve sonraki sayfa var mı */
export function parseCategoryPage(html: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();
  $('a[href*="/urun/"]').each((_, a) => {
    const h = ($(a).attr("href") ?? "").replace(/^https?:\/\/(www\.)?arenadedektor\.com/i, "").split("?")[0];
    if (h.startsWith("/urun/")) links.add(h);
  });
  const pages = $(".pagination a")
    .toArray()
    .map((a) => Number(($(a).attr("href") ?? "").match(/[?&]p=(\d+)/)?.[1] ?? 0));
  return { links: [...links], maxPage: Math.max(1, ...pages) };
}

export function parseSitemap(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/(www\.)?arenadedektor\.com/i, ""));
}

export function parsePost(html: string, path: string, base: string): ArenaPost | null {
  const $ = cheerio.load(html);
  const title = $("h1").first().text().trim();
  if (!title) return null;
  // İçerik: doğrudan çocuk olarak en çok paragraf/başlık barındıran blokların ortak atası
  const scored = $("div,article,section")
    .toArray()
    .map((el) => ({ el, n: $(el).children("p,h2,h3,h4,ul,ol,table").length }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, 4);
  let root = scored[0]?.el;
  if (!root) return null;
  for (const s of scored.slice(1)) {
    while (root && !$(root).find(s.el).length && root !== s.el) root = $(root).parent()[0] as typeof root;
  }
  const r = $(root);
  r.find("header,footer,nav,form,script,style,.modal,.breadcrumb,h1").remove();
  const contentMd = cleanMd(turndown().turndown(r.html() ?? ""));
  const coverSrc = $('img[src*="/Images/Blog/"]').first().attr("src");
  const dm = $("body").text().match(/(\d{2})[./](\d{2})[./](\d{4})/);
  return {
    path,
    slug: path.replace(/^\/blog\//, ""),
    title,
    metaDescription: $('meta[name="description"]').attr("content")?.trim() || null,
    cover: coverSrc ? abs(base, coverSrc) : null,
    date: dm ? new Date(`${dm[3]}-${dm[2]}-${dm[1]}T09:00:00+03:00`) : null,
    contentMd,
  };
}

/** Kart görünümü için ad: baştaki marka ve sondaki "Dedektör" ekini at (SEO başlığı ayrıca saklanır). */
export function displayName(name: string, brand: string | null) {
  let n = name.trim();
  if (brand && n.toLocaleLowerCase("tr").startsWith(brand.toLocaleLowerCase("tr") + " ")) n = n.slice(brand.length + 1);
  n = n.replace(/\s+Dedektör(ü)?$/i, "").trim();
  return n || name;
}

/** Metinden teknoloji / su geçirmezlik tahmini (emin olunamayan durumda boş bırakılır). */
export function guessSpecs(text: string, isAccessory: boolean) {
  if (isAccessory) return { technology: null, waterproof: null } as const;
  const t = text.toLocaleLowerCase("tr");
  const technology = /görüntüleme|3d|görüntülü/.test(t)
    ? ("IMAGING" as const)
    : /\bgp[xz]\b|gpz|gpx|pulse induction|\bpi\b|zvt/.test(t)
      ? ("PI" as const)
      : /multi-?iq|çoklu frekans|çok frekans|eşzamanlı|multi frekans|multi-flex|fmf/.test(t)
        ? ("MULTI" as const)
        : null;
  const waterproof = /dalış|ip68|\d+\s*m(etre)?ye? kadar su|su altı|tamamen su geçirmez|tam su geçirmez/.test(t) ? ("FULL" as const) : /başlık su geçirmez|su geçirmez başlık/.test(t) ? ("COIL_ONLY" as const) : null;
  return { technology, waterproof };
}
