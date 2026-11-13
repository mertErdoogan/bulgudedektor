import Link from "next/link";
import { Heart, MessageCircle, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getActiveBrands, getBrandGroups, getNav } from "@/lib/store";
import { CartButton, SearchBox } from "./bits";
import { NavBar } from "./nav-bar";
import { QuickLists } from "./rails";

export async function StoreHeader() {
  const [s, nav, brands, customer, brandGroups] = await Promise.all([getSettings(), getNav(), getActiveBrands(), getCustomer(), getBrandGroups()]);
  const header = nav.menu.filter((m) => m.location === "HEADER");
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";
  return (
    <header className="sticky top-0 z-30 bg-white md:static">
      {s.store.announcement ? (
        <div className="scrollbar-none overflow-x-auto bg-deep px-4 py-2 text-center text-[12px] font-semibold tracking-wide whitespace-nowrap text-white/85">
          {s.store.announcement.split("·").map((t, i) => (
            <span key={i}>
              {i ? <span className="mx-4 text-white/30">•</span> : null}
              {t.trim()}
            </span>
          ))}
        </div>
      ) : null}
      <div className="border-b border-line">
        <div className="container-x flex items-center gap-4 py-3 md:gap-8 md:py-5">
          <Link href="/" aria-label={`${s.store.name} ana sayfa`} className="shrink-0">
            <Logo size={30} />
          </Link>
          <SearchBox className="hidden max-w-[560px] flex-1 md:flex" />
          <div className="ml-auto flex items-center gap-1">
            <a href={wa} target="_blank" className="mr-1 hidden h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-bold text-[#11643a] transition hover:bg-[#e9f9ef] lg:flex">
              <MessageCircle size={17} /> Uzmana sor
            </a>
            <a href={wa} target="_blank" aria-label="WhatsApp ile uzmana sor" className="grid h-11 w-11 place-items-center rounded-full bg-[#e9f9ef] text-[#11643a] lg:hidden">
              <MessageCircle size={20} />
            </a>
            <QuickLists />
            <Link href="/hesabim" className="hidden h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-bold transition hover:bg-soft md:flex" aria-label="Hesabım">
              <User size={18} /> <span className="hidden xl:inline">{customer ? customer.name.split(" ")[0] : "Giriş yap"}</span>
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-line md:block" />
            <span className="hidden md:block">
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
          <SearchBox />
        </div>
      </div>
      <NavBar
        items={header.map((m) => ({ id: m.id, label: m.label, url: m.url, highlight: !!m.highlight, image: nav.categories.find((c) => m.url === `/kategori/${c.slug}`)?.imageUrl ?? null }))}
        categories={nav.categories}
        brands={brands.map((b) => ({ name: b.name, slug: b.slug }))}
        brandGroups={brandGroups}
      />
    </header>
  );
}
