import { cardCtx } from "@/lib/card-ctx";
import Link from "next/link";
import { Check, ChevronDown, Compass, Sparkles } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { facetCounts, listProducts, type CatalogFilter } from "@/lib/store";
import { EXPERIENCE_LABEL, TECH_LABEL, WATERPROOF_LABEL } from "@/lib/utils";
import { FilterForm } from "./filter-form";
import { Breadcrumbs } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { graph, itemListLd } from "@/lib/seo";
import { ProductCard } from "./product-card";

export type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(",") : []);

export function parseFilter(sp: SP, base: Partial<CatalogFilter> = {}): CatalogFilter {
  return {
    ...base,
    q: typeof sp.q === "string" ? sp.q : base.q,
    category: base.category ?? (typeof sp.kategori === "string" ? sp.kategori : undefined),
    brand: base.brand ?? arr(sp.marka),
    tech: arr(sp.tek),
    water: arr(sp.su),
    exp: arr(sp.seviye),
    use: typeof sp.amac === "string" ? sp.amac : undefined,
    min: Number(sp.min) || undefined,
    max: Number(sp.max) || undefined,
    stock: sp.stok === "1",
    light: sp.hafif === "1",
    sort: typeof sp.sirala === "string" ? sp.sirala : undefined,
  };
}

export async function Catalog({ title, intro, crumbs, sp, base, hideBrand, top, children }: { title: string; intro?: React.ReactNode; crumbs?: { href: string; label: string }[]; sp: SP; base?: Partial<CatalogFilter>; hideBrand?: boolean; top?: React.ReactNode; children?: React.ReactNode }) {
  const f = parseFilter(sp, base);
  const [items, facets, s] = await Promise.all([listProducts(f), facetCounts(base?.category), getSettings()]);
  const active = [
    ...(f.brand && !hideBrand ? f.brand.map((b) => ({ k: "marka", v: b, l: facets.brands.find((x) => x.slug === b)?.name ?? b })) : []),
    ...(f.tech ?? []).map((v) => ({ k: "tek", v, l: TECH_LABEL[v] })),
    ...(f.water ?? []).map((v) => ({ k: "su", v, l: WATERPROOF_LABEL[v] })),
    ...(f.exp ?? []).map((v) => ({ k: "seviye", v, l: EXPERIENCE_LABEL[v] })),
    ...(f.max ? [{ k: "max", v: String(f.max), l: `${f.max.toLocaleString("tr-TR")} TL'ye kadar` }] : []),
    ...(f.min ? [{ k: "min", v: String(f.min), l: `${f.min.toLocaleString("tr-TR")} TL'den` }] : []),
    ...(f.stock ? [{ k: "stok", v: "1", l: "Stokta" }] : []),
    ...(f.light ? [{ k: "hafif", v: "1", l: "1,5 kg altı" }] : []),
  ];
  const removeHref = (k: string, v: string) => {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) {
      for (const x of arr(val)) if (!(key === k && x === v)) q.append(key, x);
    }
    return `?${q}`;
  };
  const addHref = (k: string, v: string) => {
    const q = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) for (const x of arr(val)) q.append(key, x);
    if (["stok", "hafif", "max"].includes(k)) q.delete(k);
    q.append(k, v);
    return `?${q}`;
  };
  const on = (k: string, v: string) => arr(sp[k]).includes(v);
  const has = (m: Map<string, number>, k: string) => (m.get(k) ?? 0) > 0;
  const focus = s.merch.focusBrand;
  const quick = [
    { k: "stok", v: "1", l: "Stokta", show: true },
    ...(!hideBrand && focus && facets.brands.some((b) => b.slug === focus) ? [{ k: "marka", v: focus, l: facets.brands.find((b) => b.slug === focus)!.name, show: true }] : []),
    { k: "seviye", v: "BEGINNER", l: "İlk cihaz", show: has(facets.exp, "BEGINNER") },
    { k: "tek", v: "MULTI", l: "Çok frekanslı", show: has(facets.tech, "MULTI") },
    { k: "su", v: "FULL", l: "Su geçirmez", show: has(facets.water, "FULL") },
    { k: "hafif", v: "1", l: "1,5 kg altı", show: true },
    { k: "max", v: "50000", l: "50.000 TL altı", show: true },
  ]
    .filter((q) => q.show)
    .map((q) => ({ ...q, on: on(q.k, q.v) }));
  return (
    <div className="container-x py-5">
      {crumbs ? <Breadcrumbs className="mb-2" items={crumbs.map((c) => ({ name: c.label, path: c.href }))} /> : null}
      {!active.length && !f.q ? <JsonLd data={graph(itemListLd(title, items))} /> : null}
      <div className="max-w-3xl">
        <h1 className="font-display text-[26px] font-extrabold md:text-[32px]">{title}</h1>
        {intro ? <p className="mt-1.5 text-[14.5px] leading-relaxed text-mute">{intro}</p> : null}
        {/* Kısa cevap kutusu katlanmış durur: arama motorları ve yapay zekâ aramaları için metin sayfada kalır,
            kullanıcıya yer kaplamaz. Yanında küçük bir sihirbaz bağlantısı. */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
          {top ? (
            <details className="group w-full sm:w-auto [&[open]]:w-full" data-testid="catalog-answer">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 font-bold text-deep transition hover:bg-[#ececee] [&::-webkit-details-marker]:hidden">
                <Sparkles size={13} className="text-brand" /> Kısa bilgi
                <ChevronDown size={14} className="text-mute transition group-open:rotate-180" />
              </summary>
              <div className="mt-2.5">{top}</div>
            </details>
          ) : null}
          <Link href="/sihirbaz" className="inline-flex items-center gap-1.5 font-bold text-link hover:underline">
            <Compass size={14} className="text-brand" /> Kararsız mısın? 6 soruda öneri al
          </Link>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <FilterForm
          sp={Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, arr(v)]))}
          brands={hideBrand ? [] : facets.brands}
          tech={[...facets.tech].map(([k, n]) => ({ k, n, l: TECH_LABEL[k] }))}
          water={[...facets.water].map(([k, n]) => ({ k, n, l: WATERPROOF_LABEL[k] }))}
          exp={[...facets.exp].map(([k, n]) => ({ k, n, l: EXPERIENCE_LABEL[k] }))}
          count={items.length}
        />
        <div>
          {/* Hızlı filtreler: en çok kullanılanlar, tek dokunuşla açılır/kapanır */}
          {quick.length ? (
            <div className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" data-testid="quick-filters">
              <span className="hidden shrink-0 items-center text-[12px] font-extrabold tracking-[.12em] text-mute md:flex">HIZLI</span>
              {quick.map((q) => (
                <Link
                  key={q.k + q.v}
                  href={q.on ? removeHref(q.k, q.v) : addHref(q.k, q.v)}
                  scroll={false}
                  aria-pressed={q.on}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition ${q.on ? "bg-deep text-white" : "border border-line bg-white text-deep hover:border-deep"}`}
                >
                  {q.on ? <Check size={14} strokeWidth={3} /> : null}
                  {q.l}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <Link key={a.k + a.v} href={removeHref(a.k, a.v)} className="rounded-full bg-deep px-3 py-1.5 text-[13px] font-bold text-white">{a.l} ×</Link>
            ))}
            {active.length ? <Link href="?" className="text-[13px] font-bold text-link underline">Temizle</Link> : null}
            <span className="ml-auto text-[13px] font-semibold text-mute">{items.length} ürün</span>
          </div>
          {items.length ? (
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} ctx={cardCtx(s)} compare />
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-soft p-10 text-center">
              <p className="font-bold">Bu filtrelerle ürün bulunamadı.</p>
              <p className="mt-1 text-sm text-mute">Filtreleri azalt ya da <Link href="/sihirbaz" className="font-bold text-link">sihirbaza</Link> sor.</p>
            </div>
          )}
        </div>
      </div>
      {children ? <div className="mt-12 flex flex-col gap-10">{children}</div> : null}
    </div>
  );
}
