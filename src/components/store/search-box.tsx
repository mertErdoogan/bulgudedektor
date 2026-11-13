"use client";

import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock3, Compass, CornerDownLeft, Search, Sparkles, X } from "lucide-react";
import { cn, formatTL } from "@/lib/utils";

type Prod = { id: string; name: string; slug: string; price: number; compareAtPrice?: number | null; stock?: number; allowBackorder?: boolean; brand?: string | null; image: string | null; isNew?: boolean };
type Res = {
  products: Prod[];
  total: number;
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
  posts: { title: string; slug: string }[];
  popular: string[];
  models: Prod[];
  uses: { name: string; slug: string }[];
};
const EMPTY: Res = { products: [], total: 0, categories: [], brands: [], posts: [], popular: [], models: [], uses: [] };
const RECENT_KEY = "arena:son-aramalar";

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}
function pushRecent(q: string) {
  const t = q.trim().slice(0, 60);
  if (t.length < 2) return;
  try {
    const next = [t, ...readRecent().filter((x) => x.toLocaleLowerCase("tr") !== t.toLocaleLowerCase("tr"))].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/** Yazılan kelimeyi ürün adında vurgular (Türkçe büyük/küçük harf duyarsız). */
function Hl({ text, q }: { text: string; q: string }) {
  const t = q.trim().split(/\s+/)[0]?.toLocaleLowerCase("tr");
  if (!t) return <>{text}</>;
  const i = text.toLocaleLowerCase("tr").indexOf(t);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[3px] bg-brand/12 px-px text-inherit">{text.slice(i, i + t.length)}</mark>
      {text.slice(i + t.length)}
    </>
  );
}

const stockText = (p: Prod) => (p.stock === undefined ? null : p.stock > 0 ? (p.stock <= 2 ? `Son ${p.stock} adet` : "Stokta") : p.allowBackorder ? "Siparişle" : "Tükendi");

/**
 * Arama paleti. Tıklayınca (yazmadan): son aramalar, öne çıkan modeller, markalar, kullanım alanları.
 * Yazarken: görsel + fiyat + stokla anlık ürün sonuçları, yanında marka/kategori/rehber.
 * Klavye: "/" ile açılır (hotkey), ↑↓ gezinir, Enter seçileni açar, Esc kapatır. Mobilde tam ekran açılır.
 */
export function SearchBox({ defaultValue, className, hotkey, placeholder }: { defaultValue?: string; className?: string; hotkey?: boolean; placeholder?: string }) {
  const [q, setQ] = useState(defaultValue ?? "");
  const [res, setRes] = useState<Res>(EMPTY);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [mobile, setMobile] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const listId = useId();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const f = () => setMobile(mq.matches);
    f();
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const ctl = new AbortController();
    const t = setTimeout(
      () =>
        fetch(`/api/ara?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
          .then((r) => r.json())
          .then((d: Res) => {
            setRes({ ...EMPTY, ...d });
            setHi(-1);
          })
          .catch(() => {}),
      q.trim().length < 2 ? 0 : 120,
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

  // Mobilde tam ekran açıkken arka sayfa kaymasın
  useEffect(() => {
    if (!(open && mobile)) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("arena-search-open");
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove("arena-search-open");
    };
  }, [open, mobile]);

  // "/" kısayolu: ekranda görünen arama kutusuna odaklan (kaydırınca çıkan ince başlıktaki dahil)
  useEffect(() => {
    if (!hotkey) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName))) return;
      const inputs = [...document.querySelectorAll<HTMLInputElement>("input[data-search-input]")].filter((i) => {
        const r = i.getBoundingClientRect();
        return i.offsetParent !== null && r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
      });
      const target = inputs[inputs.length - 1];
      if (!target) return;
      e.preventDefault();
      target.focus();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [hotkey]);

  const typed = q.trim().length >= 2;
  const links: string[] = typed
    ? [...res.products.map((p) => `/urun/${p.slug}`), ...res.brands.map((b) => `/marka/${b.slug}`), ...res.categories.map((c) => `/kategori/${c.slug}`), ...res.posts.map((p) => `/blog/${p.slug}`)]
    : [...recent.map((t) => `/ara?q=${encodeURIComponent(t)}`), ...res.models.map((p) => `/urun/${p.slug}`)];
  const go = (href: string) => {
    if (typed) pushRecent(q);
    setOpen(false);
    input.current?.blur();
    window.dispatchEvent(new Event("arena-nav-start"));
    window.dispatchEvent(new CustomEvent("arena-nav-to", { detail: href.split("?")[0] }));
    router.push(href);
  };
  const pick = () => {
    if (typed) pushRecent(q);
    setOpen(false);
  };
  let idx = -1;
  const next = () => ++idx;
  const active = (i: number) => hi === i;

  const kbd = "inline-grid h-[22px] min-w-[22px] place-items-center rounded-md border border-line bg-white px-1.5 font-sans text-[11.5px] font-bold text-deep";
  const sec = "mb-2.5 flex items-center gap-1.5 text-[11px] font-extrabold tracking-[.1em] text-mute";

  const show = open && (typed || recent.length > 0 || res.models.length > 0 || res.popular.length > 0 || res.uses.length > 0);

  return (
    <div ref={box} className={cn("relative", open && mobile ? "fixed inset-0 z-[70] flex flex-col bg-white" : "flex", className)}>
      <form
        action="/ara"
        role="search"
        className={cn(
          "relative flex h-12 w-full items-center gap-2.5 rounded-full border pr-1.5 pl-4 transition",
          open ? "border-deep bg-white shadow-[0_0_0_4px_rgba(29,29,31,.07)]" : "border-line bg-[#f6f6f7] hover:border-[#dcdce0]",
          open && mobile && "mx-3 mt-3 w-auto",
        )}
        onSubmit={(e) => {
          if (hi >= 0 && links[hi]) {
            e.preventDefault();
            go(links[hi]);
          } else {
            pushRecent(q);
            setOpen(false);
          }
        }}
      >
        {open && mobile ? (
          <button type="button" aria-label="Aramayı kapat" onClick={() => setOpen(false)} className="-ml-2 grid h-10 w-9 shrink-0 place-items-center">
            <ArrowLeft size={20} />
          </button>
        ) : (
          <Search size={19} strokeWidth={2.1} className="shrink-0 text-deep" />
        )}
        <input
          ref={input}
          data-search-input=""
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              input.current?.blur();
            }
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
          enterKeyHint="search"
          placeholder={placeholder ?? "Marka, model veya ürün ara"}
          className="h-full w-full min-w-0 bg-transparent text-[15px] outline-none placeholder:text-mute"
          aria-label="Ürün ara"
          aria-expanded={!!show}
          role="combobox"
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {q ? (
          <button type="button" aria-label="Temizle" onClick={() => { setQ(""); input.current?.focus(); }} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-mute hover:bg-soft">
            <X size={16} />
          </button>
        ) : hotkey && !open ? (
          <span className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-mute lg:inline-flex" aria-hidden>
            <kbd className={kbd}>/</kbd> ile ara
          </span>
        ) : open ? (
          <kbd className={cn(kbd, "hidden bg-soft text-mute md:inline-grid")} aria-hidden>ESC</kbd>
        ) : null}
        <button aria-label="Ara" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-deep text-white transition hover:bg-brand">
          <ArrowRight size={17} strokeWidth={2.3} />
        </button>
      </form>

      {show ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Arama önerileri"
          className={cn(
            "text-deep",
            mobile ? "mt-2 flex-1 overflow-y-auto overscroll-contain pb-6" : "absolute top-full left-0 z-50 mt-2.5 w-[max(100%,780px)] overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_30px_70px_-18px_rgba(20,20,22,.38)]",
          )}
        >
          {!typed ? (
            <div className="flex flex-col gap-6 p-4 md:p-6">
              {recent.length ? (
                <div>
                  <p className={sec}><Clock3 size={13} /> SON ARAMALARIN</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {recent.map((t) => {
                      const i = next();
                      return (
                        <Link key={t} href={`/ara?q=${encodeURIComponent(t)}`} onClick={pick} className={cn("inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold", active(i) ? "bg-deep text-white" : "bg-soft hover:bg-[#ececee]")}>
                          {t}
                        </Link>
                      );
                    })}
                    <button type="button" onClick={() => { try { localStorage.removeItem(RECENT_KEY); } catch {} setRecent([]); }} className="ml-1 text-[12.5px] font-semibold text-mute hover:text-deep">Temizle</button>
                  </div>
                </div>
              ) : null}
              {res.models.length ? (
                <div>
                  <p className={sec}><Sparkles size={13} /> ÖNE ÇIKAN MODELLER</p>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {res.models.slice(0, 6).map((p) => {
                      const i = next();
                      return (
                        <Link key={p.id} href={`/urun/${p.slug}`} onClick={pick} className={cn("flex items-center gap-3 rounded-2xl border p-2.5 transition", active(i) ? "border-deep bg-soft" : "border-line hover:border-[#d6d6db]")}>
                          <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl bg-soft">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.image ? <img src={imgUrl(p.image, 128)} alt="" className="h-11 w-11 object-contain mix-blend-multiply" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[14px] font-bold">{p.name}</span>
                            <span className="text-[12.5px] text-mute">{formatTL(p.price)}{p.isNew ? <b className="ml-1.5 text-[10.5px] tracking-wider text-brand">YENİ</b> : null}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {res.popular.length && !res.models.length ? (
                <div>
                  <p className={sec}>ÇOK ARANANLAR</p>
                  <div className="flex flex-wrap gap-2">
                    {res.popular.map((t) => (
                      <Link key={t} href={`/ara?q=${encodeURIComponent(t)}`} onClick={pick} className="rounded-full border border-line px-3.5 py-1.5 text-sm font-semibold hover:border-deep">{t}</Link>
                    ))}
                  </div>
                </div>
              ) : null}
              {res.brands.length || res.uses.length ? (
                <div className="grid gap-5 md:grid-cols-[auto_1fr] md:gap-8">
                  {res.brands.length ? (
                    <div>
                      <p className={sec}>MARKALAR</p>
                      <div className="flex flex-wrap gap-2">
                        {res.brands.map((b, k) => (
                          <Link key={b.slug} href={`/marka/${b.slug}`} onClick={pick} className={cn("inline-flex h-9 items-center rounded-full border px-3.5 text-[13.5px] transition hover:border-deep", k === 0 ? "border-deep font-extrabold" : "border-line font-semibold")}>{b.name}</Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {res.uses.length ? (
                    <div>
                      <p className={sec}>NE ARIYORSUN?</p>
                      <div className="flex flex-wrap gap-2">
                        {res.uses.map((c) => (
                          <Link key={c.slug} href={`/kategori/${c.slug}`} onClick={pick} className="inline-flex h-9 items-center rounded-full border border-line px-3.5 text-[13.5px] font-semibold transition hover:border-deep">{c.name}</Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : res.products.length || res.brands.length || res.categories.length || res.posts.length ? (
            <div className="grid md:grid-cols-[minmax(0,1fr)_240px]">
              <div className="p-2 md:p-3">
                {res.products.length ? <p className={cn(sec, "px-2.5 pt-2")}>ÜRÜNLER · {res.total}</p> : null}
                {res.products.map((p) => {
                  const i = next();
                  const st = stockText(p);
                  return (
                    <Link key={p.id} href={`/urun/${p.slug}`} onClick={pick} role="option" aria-selected={active(i)} className={cn("flex items-center gap-3.5 rounded-2xl px-2.5 py-2", active(i) ? "bg-soft" : "hover:bg-soft")}>
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-line bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image ? <img src={imgUrl(p.image, 128)} alt="" className="h-12 w-12 object-contain" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold"><Hl text={p.name} q={q} /></span>
                        <span className="text-[11.5px] font-extrabold tracking-wider text-brand">{p.brand?.toLocaleUpperCase("en-US")}</span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <b className="text-[15px]">{formatTL(p.price)}</b>
                        {st ? <span className={cn("text-xs font-semibold", (p.stock ?? 0) > 0 ? "text-[#11643a]" : "text-mute")}>{st}</span> : null}
                      </span>
                      {active(i) ? <CornerDownLeft size={15} className="hidden shrink-0 text-mute md:block" /> : null}
                    </Link>
                  );
                })}
              </div>
              <div className="flex flex-col gap-5 border-t border-line bg-[#fcfcfc] p-4 md:border-t-0 md:border-l md:p-5">
                {res.brands.length ? (
                  <div>
                    <p className={sec}>MARKA</p>
                    {res.brands.map((b) => {
                      const i = next();
                      return <Link key={b.slug} href={`/marka/${b.slug}`} onClick={pick} className={cn("mb-1.5 flex items-center justify-between rounded-xl border bg-white px-3 py-2.5 text-[14px] font-bold", active(i) ? "border-deep" : "border-line hover:border-deep")}>{b.name} <ArrowRight size={14} className="text-mute" /></Link>;
                    })}
                  </div>
                ) : null}
                {res.categories.length ? (
                  <div>
                    <p className={sec}>KATEGORİLER</p>
                    {res.categories.map((c) => {
                      const i = next();
                      return <Link key={c.slug} href={`/kategori/${c.slug}`} onClick={pick} className={cn("block rounded-lg px-1 py-1.5 text-[14px] font-semibold", active(i) ? "text-brand" : "hover:text-brand")}>{c.name}</Link>;
                    })}
                  </div>
                ) : null}
                {res.posts.length ? (
                  <div>
                    <p className={sec}>REHBERLER</p>
                    {res.posts.map((p) => {
                      const i = next();
                      return <Link key={p.slug} href={`/blog/${p.slug}`} onClick={pick} className={cn("flex items-start gap-2 rounded-lg px-1 py-1.5 text-[13.5px] leading-snug", active(i) ? "text-brand" : "hover:text-brand")}><BookOpen size={14} className="mt-0.5 shrink-0 text-mute" />{p.title}</Link>;
                    })}
                  </div>
                ) : null}
                {!res.brands.length && !res.categories.length && !res.posts.length ? (
                  <Link href="/sihirbaz" onClick={pick} className="flex items-center gap-2.5 text-[13.5px] font-semibold"><Compass size={18} className="text-brand" /> Emin değil misin? Bana hangisi testi</Link>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="p-5 text-sm text-mute">“{q.trim()}” için öneri bulunamadı. Enter ile tüm sonuçlara bakabilir ya da uzmana sorabilirsin.</p>
          )}
          <div className="hidden h-12 items-center justify-between border-t border-line bg-soft px-5 text-[12px] font-semibold text-mute md:flex">
            {typed ? (
              <button type="button" onClick={() => go(`/ara?q=${encodeURIComponent(q.trim())}`)} className="text-[13.5px] font-bold text-deep hover:text-brand">“{q.trim()}” için tüm sonuçlar{res.total ? ` (${res.total})` : ""} →</button>
            ) : (
              <Link href="/sihirbaz" onClick={pick} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-deep hover:text-brand"><Compass size={15} /> Emin değil misin? Bana hangisi testi</Link>
            )}
            <span className="flex gap-4"><span>↑ ↓ gez</span><span>↵ aç</span><span>esc kapat</span></span>
          </div>
          {typed && mobile ? (
            <div className="px-4 pt-2">
              <button type="button" onClick={() => go(`/ara?q=${encodeURIComponent(q.trim())}`)} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-deep text-[15px] font-bold text-white">“{q.trim()}” için tüm sonuçlar <ArrowRight size={17} /></button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
