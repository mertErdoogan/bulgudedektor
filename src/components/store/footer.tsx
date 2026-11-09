import Link from "next/link";
import { Logo } from "@/components/logo";
import { getSettings } from "@/lib/settings";
import { getFooterPages, getNav } from "@/lib/store";

export async function StoreFooter() {
  const [s, nav, pages] = await Promise.all([getSettings(), getNav(), getFooterPages()]);
  const help = nav.menu.filter((m) => m.location === "FOOTER_HELP");
  const groups = [
    { title: "Kategoriler", links: nav.categories.map((c) => ({ href: `/kategori/${c.slug}`, label: c.name })) },
    { title: "Yardım", links: [...help.map((m) => ({ href: m.url, label: m.label })), ...pages.filter((p) => p.group === "Yardım").map((p) => ({ href: `/sayfa/${p.slug}`, label: p.title }))] },
    { title: "Sözleşmeler ve kurumsal", links: pages.filter((p) => p.group !== "Yardım").map((p) => ({ href: `/sayfa/${p.slug}`, label: p.title })) },
  ];
  return (
    <footer className="mt-16 bg-deep pb-24 text-white md:pb-0">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div className="flex flex-col gap-2 text-sm">
          <Logo size={30} inverted />
          <p className="mt-3 opacity-80">{s.store.legalName}</p>
          {s.store.address ? <p className="opacity-80">{s.store.address}</p> : null}
          <p className="opacity-80">
            {s.store.phone}
            {s.store.whatsapp ? ` · WhatsApp +${s.store.whatsapp}` : ""}
          </p>
          <p className="opacity-80">{s.store.email}</p>
          <p className="opacity-60">
            {s.store.taxNumber ? `Vergi no: ${s.store.taxNumber} · ` : ""}
            {s.store.mersis ? `MERSİS: ${s.store.mersis} · ` : ""}
            {s.store.etbis ? `ETBİS: ${s.store.etbis}` : ""}
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title} className="flex flex-col gap-2 text-sm">
            <p className="mb-1 font-bold">{g.title}</p>
            {g.links.map((l) => (
              <Link key={l.href} href={l.href} className="opacity-80 hover:opacity-100 hover:underline">
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 py-4 text-xs opacity-60">
          <span>© {new Date().getFullYear()} {s.store.name}. Tüm hakları saklıdır.</span>
          <span>Ödemeler iyzico güvencesiyle 3D Secure · Kart bilgisi saklanmaz</span>
        </div>
      </div>
    </footer>
  );
}
