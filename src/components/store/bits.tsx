"use client";

import { imgUrl } from "@/lib/img";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Compass, Grid2X2, Heart, Home, Menu, Scale, Search, ShoppingCart, User, X } from "lucide-react";
import { cn, formatTL } from "@/lib/utils";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";
import { useCart } from "./cart";

export function CartButton({ compact }: { compact?: boolean }) {
  const { count, ready } = useCart();
  if (compact)
    return (
      <Link href="/sepet" aria-label="Sepet" className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-soft">
        <ShoppingCart size={21} />
        {ready && count ? <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-white">{count}</span> : null}
      </Link>
    );
  return (
    <Link href="/sepet" className="flex h-11 items-center gap-2.5 rounded-full bg-deep pr-4 pl-3.5 text-[14px] font-bold text-white transition hover:bg-black">
      <ShoppingCart size={19} /> Sepet
      {ready && count ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11.5px] font-extrabold">{count}</span> : null}
    </Link>
  );
}

export function AddToCart({ productId, name, disabled, size = "md", className, label = "Sepete ekle", price, brand, variant }: { productId: string; name: string; disabled?: boolean; size?: "md" | "lg"; className?: string; label?: string; price?: number; brand?: string | null; variant?: "card" }) {
  const { add } = useCart();
  if (variant === "card")
    // Kartlarda sakin, ikincil görünümlü buton: kırmızı her kartta bağırmasın; üzerine gelince dolar.
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => add(productId, 1, name, { price, brand })}
        className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#dcdce0] bg-white text-[13.5px] font-bold text-deep transition hover:border-deep hover:bg-deep hover:text-white disabled:opacity-50", className)}
      >
        <ShoppingCart size={16} /> {disabled ? "Stokta yok" : label}
      </button>
    );
  return (
    <Button type="button" size={size} disabled={disabled} className={cn("w-full", className)} onClick={() => add(productId, 1, name, { price, brand })}>
      {disabled ? "Stokta yok" : label}
    </Button>
  );
}

export function FavoriteButton({ productId, name, className, withLabel }: { productId: string; name?: string; className?: string; withLabel?: boolean }) {
  const { favorites, toggleFavorite, ready } = useCart();
  const on = ready && favorites.includes(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        toggleFavorite(productId, name);
      }}
      aria-pressed={on}
      aria-label={on ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={cn(
        withLabel ? "flex h-12 items-center justify-center gap-2 rounded-lg border border-line px-4 text-sm font-bold hover:border-deep" : "grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm ring-1 ring-line backdrop-blur hover:scale-105",
        className,
      )}
    >
      <Heart size={withLabel ? 18 : 17} className={on ? "fill-accent text-accent" : "text-deep"} />
      {withLabel ? (on ? "Favorilerde" : "Favorilere ekle") : null}
    </button>
  );
}

export function CompareToggle({ productId }: { productId: string }) {
  const { compare, toggleCompare } = useCart();
  const on = compare.includes(productId);
  return (
    <button type="button" onClick={() => toggleCompare(productId)} className={cn("flex items-center gap-1.5 text-xs font-bold", on ? "text-brand" : "text-mute hover:text-deep")}>
      <span className={cn("grid h-4 w-4 place-items-center rounded border-2", on ? "border-brand bg-brand text-white" : "border-[#bdbdc2]")}>{on ? "✓" : ""}</span>
      Karşılaştır
    </button>
  );
}

export function CompareBar() {
  const { compare, toggleCompare } = useCart();
  if (compare.length < 1) return null;
  return (
    <div className="fixed inset-x-0 bottom-[68px] z-30 flex justify-center px-3 md:bottom-4">
      <div className="flex items-center gap-3 rounded-xl bg-deep px-4 py-2.5 text-sm text-white shadow-xl">
        <Scale size={18} />
        <span>
          <b>{compare.length} ürün</b> seçildi {compare.length < 2 ? "· en az 2 seç" : ""}
        </span>
        <Link href={`/karsilastir?ids=${compare.join(",")}`} className={cn("rounded-lg bg-white px-3 py-1.5 font-bold text-deep", compare.length < 2 && "pointer-events-none opacity-50")}>
          Karşılaştır
        </Link>
        <button onClick={() => compare.forEach(toggleCompare)} className="text-white/70" aria-label="Temizle">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

type Cat = { id: string; name: string; slug: string; shortText: string | null; imageUrl: string | null; description: string | null };

export function MegaMenu({ categories, brands, variant = "nav" }: { categories: Cat[]; brands: { name: string; slug: string }[]; variant?: "nav" | "compact" }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState(0);
  const c = categories[cur];
  return (
    <div className={cn("relative", variant === "nav" && "flex h-full items-center")} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        aria-expanded={open}
        className={
          variant === "nav"
            ? "flex h-full items-center gap-2.5 border-r border-line pr-5 text-[14.5px] font-bold whitespace-nowrap text-deep transition hover:text-brand"
            : "flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-[14px] font-bold transition hover:border-deep"
        }
      >
        <Menu size={19} strokeWidth={2.1} /> {variant === "nav" ? "Kategoriler" : "Menü"}
      </button>
      {open && c ? (
        <div className="absolute top-full left-0 z-40 flex w-[min(1000px,calc(100vw-48px))] overflow-hidden rounded-xl border border-line bg-white pt-0 text-deep shadow-2xl">
          <ul className="w-72 shrink-0 bg-soft p-2">
            {categories.map((x, i) => (
              <li key={x.id}>
                <Link
                  href={`/kategori/${x.slug}`}
                  onMouseEnter={() => setCur(i)}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm", i === cur ? "bg-white font-bold shadow-sm" : "hover:bg-white/60")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {x.imageUrl ? <img src={imgUrl(x.imageUrl, 64)} alt="" className="h-8 w-8 object-contain mix-blend-multiply" /> : <span className="h-8 w-8" />}
                  <span className="flex-1">
                    {x.name}
                    <span className="block text-xs font-normal text-mute">{x.shortText}</span>
                  </span>
                  <ChevronRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex flex-1 flex-col gap-4 p-6">
            <div>
              <p className="font-display text-2xl font-extrabold">{c.name}</p>
              <p className="mt-1 max-w-lg text-sm text-mute">{c.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {brands.map((b) => (
                <Link key={b.slug} href={`/kategori/${c.slug}?marka=${b.slug}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-bold hover:border-brand">
                  {b.name}
                </Link>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between rounded-xl bg-tint p-4">
              <span className="text-sm">
                <b>Emin değil misin?</b> 6 soruda sana uygun cihazı bulalım.
              </span>
              <Link href="/sihirbaz" className="rounded-lg bg-deep px-4 py-2 text-sm font-bold text-white">
                Bana hangisi? →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MobileTabBar() {
  const p = usePathname();
  const { count, ready } = useCart();
  const items = [
    { href: "/", label: "Ana sayfa", icon: Home },
    { href: "/kategoriler", label: "Kategoriler", icon: Grid2X2 },
    { href: "/sihirbaz", label: "Bana hangisi", icon: Compass, center: true },
    { href: "/sepet", label: "Sepet", icon: ShoppingCart, badge: ready ? count : 0 },
    { href: "/hesabim", label: "Hesabım", icon: User },
  ];
  if (p.startsWith("/odeme") || p.startsWith("/urun/")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Alt menü">
      {items.map((i) => {
        const on = i.href === "/" ? p === "/" : p.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold", on || i.center ? "text-brand" : "text-mute")}>
            {i.center ? (
              <span className="-mt-5 grid h-11 w-11 place-items-center rounded-full border-[3px] border-white bg-brand text-white shadow-lg">
                <i.icon size={21} />
              </span>
            ) : (
              <i.icon size={21} />
            )}
            {i.badge ? <span className="absolute top-1 left-1/2 ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] text-white">{i.badge}</span> : null}
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export { SearchBox } from "./search-box";

export function FavIcon() {
  return <Heart size={16} />;
}

export function PriceInstallment({ price, n }: { price: number; n: number }) {
  if (n <= 1) return null;
  return (
    <span>
      {n} ay vade farksız <b>{formatTL(Math.round(price / n))}</b>
    </span>
  );
}

export function MobileLogo() {
  return <Logo size={26} />;
}
