"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SlidersHorizontal, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n";

type Opt = { k: string; n: number; l: string };

export function FilterForm({ sp, brands, tech, water, exp, count }: { sp: Record<string, string[]>; brands: { slug: string; name: string; n: number }[]; tech: Opt[]; water: Opt[]; exp: Opt[]; count: number }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const t = useT();
  const has = (k: string, v: string) => sp[k]?.includes(v);
  const apply = () => {
    if (!ref.current) return;
    const fd = new FormData(ref.current);
    const q = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (String(v)) q.append(k, String(v));
    window.dispatchEvent(new Event("site-nav-start")), router.push(`${window.location.pathname}?${q}`, { scroll: false });
  };
  const Group = ({ title, name, opts }: { title: string; name: string; opts: Opt[] }) =>
    opts.length ? (
      <div role="group" aria-label={title} className="border-b border-line pt-5 pb-4">
        <p aria-hidden className="mb-3 text-sm font-extrabold">{title}</p>
        <div className="flex flex-col gap-2.5">
          {opts.map((o) => (
            <label key={o.k} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" name={name} value={o.k} defaultChecked={has(name, o.k)} onChange={apply} className="h-[18px] w-[18px] accent-brand" />
              <span className="flex-1">{o.l}</span>
              <span className="text-xs text-mute">{o.n}</span>
            </label>
          ))}
        </div>
      </div>
    ) : null;
  return (
    <>
      <div className="sticky top-[132px] z-20 -mx-4 flex gap-2 border-b border-line bg-white px-4 py-2 md:hidden">
        <button type="button" onClick={() => setOpen(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-deep text-sm font-extrabold">
          <SlidersHorizontal size={17} /> {t("filter.filter")} {Object.keys(sp).filter((k) => !["sirala", "q"].includes(k)).length ? `(${Object.values(sp).flat().length})` : ""}
        </button>
        <select
          className="h-11 flex-1 rounded-lg border border-deep bg-white px-3 text-sm font-extrabold"
          defaultValue={sp.sirala?.[0] ?? ""}
          onChange={(e) => {
            const q = new URLSearchParams(Object.entries(sp).flatMap(([k, vs]) => vs.map((v) => [k, v])));
            q.set("sirala", e.target.value);
            window.dispatchEvent(new Event("site-nav-start")), router.push(`${window.location.pathname}?${q}`, { scroll: false });
          }}
          aria-label={t("filter.sort")}
        >
          <option value="">{t("filter.sortBestShort")}</option>
          <option value="fiyat-artan">{t("filter.sortPriceAsc")}</option>
          <option value="fiyat-azalan">{t("filter.sortPriceDesc")}</option>
          <option value="yeni">{t("filter.sortNew")}</option>
          <option value="cok-satan">{t("filter.sortBestSeller")}</option>
          <option value="hafif">{t("filter.sortLight")}</option>
        </select>
      </div>
      {/* Masaüstünde yapışkan: liste kaydırılırken filtreler ekranda kalır; uzunsa kendi içinde kayar */}
      <aside className={cn("md:sticky md:top-[84px] md:z-10 md:block md:self-start", open ? "fixed inset-0 z-50 flex flex-col justify-end bg-black/40 md:bg-transparent" : "hidden")} data-testid="filter-aside">
        <div className={cn("scrollbar-thin md:max-h-[calc(100vh-104px)] md:overflow-y-auto md:overscroll-contain md:rounded-none md:p-0 md:pr-2", open && "max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4")}>
          {open ? (
            <div className="mb-2 flex items-center justify-between md:hidden">
              <b className="text-lg">{t("filter.filter")}</b>
              <button onClick={() => setOpen(false)} aria-label={t("filter.close")}><X /></button>
            </div>
          ) : null}
          <form ref={ref} onSubmit={(e) => { e.preventDefault(); apply(); setOpen(false); }}>
            {sp.q ? <input type="hidden" name="q" value={sp.q[0]} /> : null}
            {sp.amac ? <input type="hidden" name="amac" value={sp.amac[0]} /> : null}
            <div className="hidden border-b border-line pb-4 md:block">
              <label className="mb-2 block text-sm font-extrabold" htmlFor="sirala">{t("filter.sort")}</label>
              <select id="sirala" name="sirala" defaultValue={sp.sirala?.[0] ?? ""} onChange={apply} className="h-10 w-full rounded-lg border border-[#d6d6d9] px-3 text-sm">
                <option value="">{t("filter.sortBest")}</option>
                <option value="fiyat-artan">{t("filter.sortPriceAsc")}</option>
                <option value="fiyat-azalan">{t("filter.sortPriceDesc")}</option>
                <option value="yeni">{t("filter.sortNew")}</option>
          <option value="cok-satan">{t("filter.sortBestSeller")}</option>
                <option value="hafif">{t("filter.sortLight")}</option>
              </select>
            </div>
            <Group title={t("filter.experience")} name="seviye" opts={exp} />
            <Group title={t("filter.brand")} name="marka" opts={brands.map((b) => ({ k: b.slug, n: b.n, l: b.name }))} />
            <Group title={t("filter.tech")} name="tek" opts={tech} />
            <Group title={t("filter.water")} name="su" opts={water} />
            <div role="group" aria-label={t("filter.budget")} className="border-b border-line pt-5 pb-4">
              <p aria-hidden className="mb-3 text-sm font-extrabold">{t("filter.budget")}</p>
              {/* Bütçe: Enter veya ok butonu uygular (telefonda alttaki "ürünü göster" butonu da uygular) */}
              <div className="flex items-center gap-1.5">
                <input name="min" inputMode="numeric" placeholder={t("filter.min")} defaultValue={sp.min?.[0]} aria-label={t("filter.min")} className="h-10 w-full min-w-0 rounded-lg border border-[#d6d6d9] px-3 text-sm" />
                <span aria-hidden className="text-mute">–</span>
                <input name="max" inputMode="numeric" placeholder={t("filter.max")} defaultValue={sp.max?.[0]} aria-label={t("filter.max")} className="h-10 w-full min-w-0 rounded-lg border border-[#d6d6d9] px-3 text-sm" />
                <button type="submit" aria-label={t("filter.apply")} title={t("filter.apply")} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-deep text-white transition hover:bg-black active:scale-95" data-testid="budget-apply">
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-2.5 pt-5 pb-4">
              <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="stok" value="1" defaultChecked={has("stok", "1")} onChange={apply} className="h-[18px] w-[18px] accent-brand" /> {t("filter.stockToday")}</label>
              <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="hafif" value="1" defaultChecked={has("hafif", "1")} onChange={apply} className="h-[18px] w-[18px] accent-brand" /> {t("filter.light")}</label>
            </div>
            <button className="mt-2 h-12 w-full rounded-lg bg-brand font-extrabold text-white md:hidden">{t("filter.show", { n: count })}</button>
          </form>
        </div>
      </aside>
    </>
  );
}
