import Link from "next/link";
import { MessageCircle, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getActiveBrands, getNav } from "@/lib/store";
import { CartButton, MegaMenu, SearchBox } from "./bits";

export async function StoreHeader() {
  const [s, nav, brands, customer] = await Promise.all([getSettings(), getNav(), getActiveBrands(), getCustomer()]);
  const header = nav.menu.filter((m) => m.location === "HEADER");
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";
  return (
    <header className="sticky top-0 z-30 bg-white md:static">
      {s.store.announcement ? (
        <div className="scrollbar-none overflow-x-auto bg-deep px-4 py-2 text-center text-[12.5px] font-bold whitespace-nowrap text-white">
          {s.store.announcement.split("·").map((t, i) => (
            <span key={i}>
              {i ? <span className="mx-3 text-gold">✦</span> : null}
              {t.trim()}
            </span>
          ))}
        </div>
      ) : null}
      <div className="border-b border-line">
        <div className="container-x flex items-center gap-4 py-3 md:py-4">
          <Link href="/" aria-label={`${s.store.name} ana sayfa`} className="shrink-0">
            <Logo size={30} />
          </Link>
          <SearchBox className="hidden flex-1 md:flex" />
          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            <a href={wa} target="_blank" className="hidden h-11 items-center gap-2 rounded-lg bg-[#e9f9ef] px-3.5 text-sm font-extrabold text-[#11643a] lg:flex">
              <MessageCircle size={18} /> Uzmana sor
            </a>
            <a href={wa} target="_blank" aria-label="WhatsApp ile uzmana sor" className="grid h-11 w-11 place-items-center rounded-full bg-[#e9f9ef] text-[#11643a] lg:hidden">
              <MessageCircle size={20} />
            </a>
            <Link href="/hesabim" className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-bold hover:bg-soft md:flex" aria-label="Hesabım">
              <User size={19} /> <span className="hidden xl:inline">{customer ? customer.name.split(" ")[0] : "Giriş yap"}</span>
            </Link>
            <span className="hidden md:block">
              <CartButton />
            </span>
            <span className="md:hidden">
              <CartButton compact />
            </span>
          </div>
        </div>
        <div className="container-x pb-3 md:hidden">
          <SearchBox />
        </div>
      </div>
      <nav className="hidden border-b border-line md:block" aria-label="Kategoriler">
        <div className="container-x flex h-[60px] items-center gap-2">
          <MegaMenu categories={nav.categories} brands={brands.map((b) => ({ name: b.name, slug: b.slug }))} />
          <div className="scrollbar-none flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto whitespace-nowrap">
            {header.map((m) => (
              <Link key={m.id} href={m.url} className={`rounded-lg px-3 py-2 text-sm font-bold hover:bg-soft hover:text-link ${m.highlight ? "text-link" : ""}`}>
                {m.highlight ? <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand align-middle" /> : null}
                {m.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
