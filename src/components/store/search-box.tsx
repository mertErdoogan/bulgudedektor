"use client";

import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, FolderOpen, Search, Tag, TrendingUp, X } from "lucide-react";
import { cn, formatTL } from "@/lib/utils";

type Res = {
  products: { id: string; name: string; slug: string; price: number; brand: string | null; image: string | null }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
  posts: { title: string; slug: string }[];
  popular: string[];
};
const EMPTY: Res = { products: [], categories: [], brands: [], posts: [], popular: [] };

/** Arama kutusu: yazarken ürün, kategori, marka ve rehber önerir; yazım hatasını tolere eder. */
export function SearchBox({ defaultValue, className }: { defaultValue?: string; className?: string }) {
  const [q, setQ] = useState(defaultValue ?? "");
  const [res, setRes] = useState<Res>(EMPTY);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const ctl = new AbortController();
    const t = setTimeout(
      () =>
        fetch(`/api/ara?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
          .then((r) => r.json())
          .then((d: Res) => {
            setRes(d);
            setHi(-1);
          })
          .catch(() => {}),
      q.trim().length < 2 ? 0 : 160,
    );
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [q, open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const links = [
    ...res.categories.map((c) => ({ href: `/kategori/${c.slug}` })),
    ...res.brands.map((b) => ({ href: `/marka/${b.slug}` })),
    ...res.products.map((p) => ({ href: `/urun/${p.slug}` })),
    ...res.posts.map((p) => ({ href: `/blog/${p.slug}` })),
  ];
  const go = (href: string) => {
    setOpen(false);
    window.dispatchEvent(new Event("arena-nav-start"));
    router.push(href);
  };
  const typed = q.trim().length >= 2;
  const has = links.length > 0;
  let idx = -1;
  const row = (active: boolean) => cn("flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm", active ? "bg-soft" : "hover:bg-soft");

  return (
    <form
      ref={box}
      action="/ara"
      role="search"
      className={cn("relative flex h-12 items-center gap-2 rounded-xl bg-soft pr-1.5 pl-4 focus-within:ring-2 focus-within:ring-brand/25", className)}
      onSubmit={(e) => {
        if (hi >= 0 && links[hi]) {
          e.preventDefault();
          go(links[hi].href);
        } else setOpen(false);
      }}
    >
      <Search size={18} className="shrink-0 text-mute" />
      <input
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (!links.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((h) => (h + 1) % links.length);
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((h) => (h <= 0 ? links.length - 1 : h - 1));
          }
        }}
        autoComplete="off"
        placeholder="Ne arıyorsun? Vanquish, pointer, altın dedektörü…"
        className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none"
        aria-label="Ürün ara"
        aria-expanded={open}
        role="combobox"
        aria-controls="arama-onerileri"
      />
      {q ? (
        <button type="button" aria-label="Temizle" onClick={() => { setQ(""); setRes(EMPTY); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-white">
          <X size={16} />
        </button>
      ) : null}
      <button className="hidden h-10 shrink-0 rounded-lg bg-brand px-5 text-sm font-extrabold text-white sm:block">Ara</button>

      {open && (typed || res.popular.length) ? (
        <div id="arama-onerileri" role="listbox" className="absolute top-full right-0 left-0 z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 text-deep shadow-2xl">
          {!typed ? (
            <div className="p-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-mute"><TrendingUp size={14} /> Çok arananlar</p>
              <div className="flex flex-wrap gap-2">
                {res.popular.map((t) => (
                  <button key={t} type="button" onClick={() => go(`/ara?q=${encodeURIComponent(t)}`)} className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:border-deep">{t}</button>
                ))}
              </div>
            </div>
          ) : has ? (
            <>
              {res.categories.map((c) => {
                idx++;
                return <Link key={c.slug} href={`/kategori/${c.slug}`} onClick={() => setOpen(false)} className={row(hi === idx)}><FolderOpen size={16} className="text-mute" /> <span><b>{c.name}</b> <span className="text-mute">kategorisi</span></span></Link>;
              })}
              {res.brands.map((b) => {
                idx++;
                return <Link key={b.slug} href={`/marka/${b.slug}`} onClick={() => setOpen(false)} className={row(hi === idx)}><Tag size={16} className="text-mute" /> <span><b>{b.name}</b> <span className="text-mute">markası</span></span></Link>;
              })}
              {res.products.length ? <p className="px-2.5 pt-2 pb-1 text-xs font-extrabold text-mute">Ürünler</p> : null}
              {res.products.map((p) => {
                idx++;
                return (
                  <Link key={p.id} href={`/urun/${p.slug}`} onClick={() => setOpen(false)} className={row(hi === idx)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image ? <img src={imgUrl(p.image, 96)} alt="" className="h-11 w-11 shrink-0 rounded-md bg-[#f6f6f6] object-contain mix-blend-multiply" /> : <span className="h-11 w-11 shrink-0 rounded-md bg-soft" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{p.name}</span>
                      <span className="text-xs font-extrabold tracking-wider text-brand">{p.brand?.toLocaleUpperCase("en-US")}</span>
                    </span>
                    <b className="shrink-0">{formatTL(p.price)}</b>
                  </Link>
                );
              })}
              {res.posts.map((p) => {
                idx++;
                return <Link key={p.slug} href={`/blog/${p.slug}`} onClick={() => setOpen(false)} className={row(hi === idx)}><BookOpen size={16} className="shrink-0 text-mute" /> <span className="truncate">{p.title}</span></Link>;
              })}
              <button className="mt-1 w-full rounded-lg bg-soft py-2.5 text-sm font-extrabold hover:bg-tint">“{q.trim()}” için tüm sonuçlar →</button>
            </>
          ) : (
            <p className="p-4 text-sm text-mute">“{q.trim()}” için öneri bulunamadı. Enter ile tüm sonuçlara bakabilir veya uzmana sorabilirsin.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}
