"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Opt = { k: string; n: number; l: string };

export function FilterForm({ sp, brands, tech, water, exp, count }: { sp: Record<string, string[]>; brands: { slug: string; name: string; n: number }[]; tech: Opt[]; water: Opt[]; exp: Opt[]; count: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const has = (k: string, v: string) => sp[k]?.includes(v);
  const apply = () => {
    if (!ref.current) return;
    const fd = new FormData(ref.current);
    const q = new URLSearchParams();
    for (const [k, v] of fd.entries()) if (String(v)) q.append(k, String(v));
    router.push(`${pathname}?${q}`, { scroll: false });
  };
  const Group = ({ title, name, opts }: { title: string; name: string; opts: Opt[] }) =>
    opts.length ? (
      <fieldset className="border-b border-line py-4">
        <legend className="mb-2 text-sm font-extrabold">{title}</legend>
        <div className="flex flex-col gap-2">
          {opts.map((o) => (
            <label key={o.k} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" name={name} value={o.k} defaultChecked={has(name, o.k)} onChange={apply} className="h-[18px] w-[18px] accent-brand" />
              <span className="flex-1">{o.l}</span>
              <span className="text-xs text-mute">{o.n}</span>
            </label>
          ))}
        </div>
      </fieldset>
    ) : null;
  return (
    <>
      <div className="sticky top-[132px] z-20 -mx-4 flex gap-2 border-b border-line bg-white px-4 py-2 md:hidden">
        <button type="button" onClick={() => setOpen(true)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-deep text-sm font-extrabold">
          <SlidersHorizontal size={17} /> Filtrele {Object.keys(sp).filter((k) => !["sirala", "q"].includes(k)).length ? `(${Object.values(sp).flat().length})` : ""}
        </button>
        <select
          className="h-11 flex-1 rounded-lg border border-deep bg-white px-3 text-sm font-extrabold"
          defaultValue={sp.sirala?.[0] ?? ""}
          onChange={(e) => {
            const q = new URLSearchParams(Object.entries(sp).flatMap(([k, vs]) => vs.map((v) => [k, v])));
            q.set("sirala", e.target.value);
            router.push(`${pathname}?${q}`, { scroll: false });
          }}
          aria-label="Sırala"
        >
          <option value="">En uygun</option>
          <option value="fiyat-artan">Fiyat artan</option>
          <option value="fiyat-azalan">Fiyat azalan</option>
          <option value="yeni">En yeni</option>
          <option value="hafif">En hafif</option>
        </select>
      </div>
      <aside className={cn("md:block", open ? "fixed inset-0 z-50 flex flex-col justify-end bg-black/40 md:static md:bg-transparent" : "hidden")}>
        <div className={cn("md:static md:max-h-none md:rounded-none md:p-0", open && "max-h-[90vh] overflow-y-auto rounded-t-2xl bg-white p-4")}>
          {open ? (
            <div className="mb-2 flex items-center justify-between md:hidden">
              <b className="text-lg">Filtrele</b>
              <button onClick={() => setOpen(false)} aria-label="Kapat"><X /></button>
            </div>
          ) : null}
          <form ref={ref} onSubmit={(e) => { e.preventDefault(); apply(); setOpen(false); }}>
            {sp.q ? <input type="hidden" name="q" value={sp.q[0]} /> : null}
            {sp.amac ? <input type="hidden" name="amac" value={sp.amac[0]} /> : null}
            <div className="hidden border-b border-line pb-4 md:block">
              <label className="mb-2 block text-sm font-extrabold" htmlFor="sirala">Sırala</label>
              <select id="sirala" name="sirala" defaultValue={sp.sirala?.[0] ?? ""} onChange={apply} className="h-10 w-full rounded-lg border border-[#d6d6d9] px-3 text-sm">
                <option value="">Bu amaca en uygun</option>
                <option value="fiyat-artan">Fiyat artan</option>
                <option value="fiyat-azalan">Fiyat azalan</option>
                <option value="yeni">En yeni</option>
                <option value="hafif">En hafif</option>
              </select>
            </div>
            <Group title="Deneyimin" name="seviye" opts={exp} />
            <Group title="Marka" name="marka" opts={brands.map((b) => ({ k: b.slug, n: b.n, l: b.name }))} />
            <Group title="Teknoloji" name="tek" opts={tech} />
            <Group title="Su geçirmezlik" name="su" opts={water} />
            <fieldset className="border-b border-line py-4">
              <legend className="mb-2 text-sm font-extrabold">Bütçe (TL)</legend>
              <div className="flex gap-2">
                <input name="min" inputMode="numeric" placeholder="En az" defaultValue={sp.min?.[0]} className="h-10 w-full rounded-lg border border-[#d6d6d9] px-3 text-sm" onBlur={apply} />
                <input name="max" inputMode="numeric" placeholder="En çok" defaultValue={sp.max?.[0]} className="h-10 w-full rounded-lg border border-[#d6d6d9] px-3 text-sm" onBlur={apply} />
              </div>
            </fieldset>
            <div className="flex flex-col gap-2 py-4">
              <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="stok" value="1" defaultChecked={has("stok", "1")} onChange={apply} className="h-[18px] w-[18px] accent-brand" /> Stokta ve aynı gün kargo</label>
              <label className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="hafif" value="1" defaultChecked={has("hafif", "1")} onChange={apply} className="h-[18px] w-[18px] accent-brand" /> 1,5 kg altı (gün boyu taşınır)</label>
            </div>
            <button className="mt-2 h-12 w-full rounded-lg bg-brand font-extrabold text-white md:hidden">{count} ürünü göster</button>
          </form>
        </div>
      </aside>
    </>
  );
}
