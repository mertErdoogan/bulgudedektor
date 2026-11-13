import Link from "next/link";
import { Check, Heart, MessageCircle, Truck, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCustomer } from "@/lib/auth";
import { getHeaderData } from "@/lib/header-data";
import { getSettings } from "@/lib/settings";
import { getActiveBrands, getNav } from "@/lib/store";
import { CartButton, SearchBox } from "./bits";
import { NavBar } from "./nav-bar";
import { INFO_LINK } from "@/lib/nav-links";
import { QuickLists } from "./rails";
import { StickyBar } from "./sticky-bar";

export async function StoreHeader() {
  const [s, nav, brands, customer, hd] = await Promise.all([getSettings(), getNav(), getActiveBrands(), getCustomer(), getHeaderData()]);
  const header = nav.menu.filter((m) => m.location === "HEADER");
  // Kurumsal sayfalar (Hakkımızda, İletişim…) üst şeritte: menü yalnız alışverişe ayrılır, ekran genişliği ne olursa olsun çakışmaz
  const info = header.filter((m) => !m.highlight && INFO_LINK.test(m.url));
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";
  const notes = s.store.announcement.split("·").map((t) => t.trim()).filter(Boolean);
  const brandList = brands.map((b) => ({ name: b.name, slug: b.slug }));
  return (
    <>
      <header data-site-header="" className="sticky top-0 z-30 bg-white md:static">
        {notes.length ? (
          <div className="hidden bg-deep text-white/85 md:block">
            {/* Masaüstü: solda güven notları, sağda kargo + sipariş takibi + telefon */}
            <div className="container-x hidden h-[34px] items-center justify-between gap-6 text-[12.5px] font-semibold md:flex">
              <div className="flex min-w-0 items-center gap-2.5 truncate">
                {notes.slice(0, 3).map((t, i) => (
                  <span key={i} className="flex items-center gap-2.5">
                    {i ? <span className="text-white/30">•</span> : null}
                    <span className={i === 0 ? "flex items-center gap-1.5 text-white" : ""}>
                      {i === 0 ? <Check size={14} strokeWidth={2.6} className="text-[#ff8a7a]" /> : null}
                      {t}
                    </span>
                  </span>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-5">
                {info.map((m) => (
                  <Link key={m.id} href={m.url} className="hidden hover:text-white lg:block">{m.label}</Link>
                ))}
                {info.length ? <span className="hidden h-3.5 w-px bg-white/25 lg:block" /> : null}
                {s.shipping.sameDayCutoff ? (
                  <span className="hidden items-center gap-1.5 2xl:flex"><Truck size={15} /> Bugün {s.shipping.sameDayCutoff}&apos;e kadar siparişler kargoda</span>
                ) : null}
                <Link href="/siparis-takip" className="hover:text-white">Sipariş takibi</Link>
                {s.store.phone ? <a href={`tel:${s.store.phone.replace(/[^\d+]/g, "")}`} className="hover:text-white">{s.store.phone}</a> : null}
              </div>
            </div>
          </div>
        ) : null}
        <div className="border-b border-line">
          <div className="container-x flex items-center gap-3 py-2.5 md:h-20 md:gap-10 md:py-0">
            <Link href="/" aria-label={`${s.store.name} ana sayfa`} className="shrink-0">
              <Logo size={19} className="md:hidden" />
              <Logo size={25} className="hidden md:block" />
            </Link>
            <SearchBox hotkey className="hidden max-w-[640px] flex-1 md:flex" placeholder="Marka, model veya ürün ara — ör. Manticore" />
            <div className="ml-auto flex items-center gap-1">
              <a href={wa} target="_blank" className="mr-1 hidden h-11 items-center gap-2.5 rounded-full px-3 transition hover:bg-[#f1faf4] lg:flex">
                <MessageCircle size={21} className="text-[#11643a]" />
                <span className="flex flex-col leading-[1.15]">
                  <span className="text-[14px] font-bold">Uzmana sor</span>
                  <span className="text-[11.5px] font-medium text-mute">WhatsApp&apos;tan yaz</span>
                </span>
              </a>
              <a href={wa} target="_blank" aria-label="WhatsApp ile uzmana sor" className="grid h-11 w-11 place-items-center rounded-full text-[#11643a] hover:bg-[#f1faf4] lg:hidden">
                <MessageCircle size={21} />
              </a>
              <span className="mx-1.5 hidden h-7 w-px bg-line lg:block" />
              <QuickLists />
              <Link href="/hesabim" className="hidden h-11 items-center gap-2 rounded-full px-3 text-[14px] font-semibold transition hover:bg-soft md:flex" aria-label="Hesabım">
                <User size={21} strokeWidth={1.9} /> <span className="hidden xl:inline">{customer ? customer.name.split(" ")[0] : "Giriş yap"}</span>
              </Link>
              <span className="ml-1 hidden md:block">
                <CartButton />
              </span>
              <Link href="/favoriler" aria-label="Favorilerim" className="grid h-11 w-11 place-items-center rounded-full hover:bg-soft md:hidden">
                <Heart size={20} />
              </Link>
              <span className="md:hidden">
                <CartButton compact />
              </span>
            </div>
          </div>
          <div className="container-x pb-3 md:hidden">
            <SearchBox placeholder="Marka veya model ara" />
          </div>
        </div>
        <NavBar items={header.map((m) => ({ id: m.id, label: m.label, url: m.url, highlight: !!m.highlight }))} categories={nav.categories} brands={brandList} focus={hd.focus} cats={hd.cats} />
      </header>
      <StickyBar categories={nav.categories} brands={brandList} wa={wa} storeName={s.store.name} />
    </>
  );
}
