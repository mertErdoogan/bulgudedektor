"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { CartButton, MegaMenu, SearchBox } from "./bits";

type Cat = Parameters<typeof MegaMenu>[0]["categories"];

/**
 * Masaüstünde sayfa aşağı kaydırılınca üstten inen ince başlık: logo, menü, arama, uzman, hesap, sepet.
 * Böylece arama ve sepet her an bir tık uzakta; büyük başlık yer kaplamaz.
 */
export function StickyBar({ categories, brands, wa, storeName }: { categories: Cat; brands: { name: string; slug: string }[]; wa: string; storeName: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let raf = 0;
    const f = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOn(window.scrollY > 240));
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => {
      window.removeEventListener("scroll", f);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      data-testid="sticky-bar"
      inert={!on}
      aria-hidden={!on}
      className={cn(
        "fixed inset-x-0 top-0 z-40 hidden border-b border-line bg-white/90 shadow-[0_8px_24px_-16px_rgba(20,20,22,.3)] backdrop-blur-xl transition duration-300 md:block",
        on ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="container-x flex h-16 items-center gap-5">
        <Link href="/" aria-label={`${storeName} ana sayfa`} className="shrink-0">
          <Logo size={18} />
        </Link>
        <MegaMenu categories={categories} brands={brands} variant="compact" />
        <SearchBox className="max-w-[560px] flex-1" />
        <div className="ml-auto flex items-center gap-1">
          <a href={wa} target="_blank" aria-label="WhatsApp ile uzmana sor" className="grid h-11 w-11 place-items-center rounded-full text-[#11643a] hover:bg-[#f1faf4]">
            <MessageCircle size={20} />
          </a>
          <Link href="/hesabim" aria-label="Hesabım" className="grid h-11 w-11 place-items-center rounded-full hover:bg-soft">
            <User size={20} strokeWidth={1.9} />
          </Link>
          <CartButton />
        </div>
      </div>
    </div>
  );
}
