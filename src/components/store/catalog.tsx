import { cardCtx } from "@/lib/card-ctx";
import Link from "next/link";
import { Compass } from "lucide-react";
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
  return (
    <div className="container-x py-5">
      {crumbs ? <Breadcrumbs className="mb-2" items={crumbs.map((c) => ({ name: c.label, path: c.href }))} /> : null}
      {!active.length && !f.q ? <JsonLd data={graph(itemListLd(title, items))} /> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="font-display text-[26px] font-extrabold md:text-[32px]">{title}</h1>
          {intro ? <div className="mt-2 text-[15px] leading-relaxed text-[#3f3f46]">{intro}</div> : null}
          {top ? <div className="mt-3">{top}</div> : null}
        </div>
        <Link href="/sihirbaz" className="flex shrink-0 items-center gap-3 rounded-xl bg-tint px-4 py-3 text-sm">
          <Compass className="text-brand" />
          <span><b>Hâlâ kararsız mısın?</b><br /><span className="text-mute">6 soruda sana özel 3 öneri</span></span>
        </Link>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[250px_minmax(0,1fr)]">
        <FilterForm
          sp={Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, arr(v)]))}
          brands={hideBrand ? [] : facets.brands}
          tech={[...facets.tech].map(([k, n]) => ({ k, n, l: TECH_LABEL[k] }))}
          water={[...facets.water].map(([k, n]) => ({ k, n, l: WATERPROOF_LABEL[k] }))}
          exp={[...facets.exp].map(([k, n]) => ({ k, n, l: EXPERIENCE_LABEL[k] }))}
          count={items.length}
        />
        <div>
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
