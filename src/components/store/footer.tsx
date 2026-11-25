import { cardReady } from "@/lib/card-ready";
import { linkAllowed } from "@/lib/nav-links";
import Link from "@/components/locale-link";
import { Logo } from "@/components/logo";
import { ConsentLink } from "./consent";
import { getSettings } from "@/lib/settings";
import { getFooterPages, getNav } from "@/lib/store";
import { LangSwitch } from "./lang-switch";
import { getPathname, getT } from "@/lib/i18n/server";
import { DEFAULT_LOCALE, LOCALES } from "@/lib/i18n/config";

export async function StoreFooter() {
  const [s, nav, pages, t, path] = await Promise.all([getSettings(), getNav(), getFooterPages(), getT(), getPathname()]);
  const langs = LOCALES.filter((l) => l === DEFAULT_LOCALE || s.i18n.locales.includes(l));
  const st = s.store;
  const social = ([[st.instagram, "Instagram"], [st.youtube, "YouTube"], [st.tiktok, "TikTok"], [st.facebook, "Facebook"], [st.x, "X"], [st.linkedin, "LinkedIn"], [st.googleBusinessUrl, t.locale === "en" ? "Google Maps" : "Google Haritalar"]] as const).filter(([h]) => h) as unknown as [string, string][];
  const help = nav.menu.filter((m) => m.location === "FOOTER_HELP");
  const groups = [
    { title: t("footer.categories"), links: nav.categories.map((c) => ({ href: `/kategori/${c.slug}`, label: c.name })) },
    { title: t("footer.help"), links: [...(t.locale === "tr" ? [{ href: "/blog", label: t("footer.guides") }] : []), { href: "/sss", label: t("footer.faq") }, { href: "/sozluk", label: t("footer.glossary") }, { href: "/sihirbaz", label: t("footer.whichDetector") }, ...help.map((m) => ({ href: m.url, label: m.label })), ...pages.filter((p) => p.group === "Yardım").map((p) => ({ href: `/sayfa/${p.slug}`, label: p.title }))].filter((l) => linkAllowed(l.href, s.catalog)) },
    { title: t("footer.legal"), links: pages.filter((p) => p.group !== "Yardım").map((p) => ({ href: `/sayfa/${p.slug}`, label: p.title })) },
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
          <a href={`mailto:${s.store.email}`} className="block opacity-80 hover:opacity-100">{s.store.email}</a>
          <p className="opacity-60">
            {s.store.taxNumber ? `${t("footer.taxNo")}: ${s.store.taxNumber} · ` : ""}
            {s.store.mersis ? `MERSİS: ${s.store.mersis} · ` : ""}
            {s.store.etbis ? `ETBİS: ${s.store.etbis}` : ""}
          </p>
          {social.length ? (
            <p className="mt-2 flex flex-wrap gap-2">
              {social.map(([href, label]) => (
                <a key={href} href={href} target="_blank" rel="noopener me" className="rounded-full border border-white/25 px-3 py-1 text-xs font-bold hover:bg-white/10">{label}</a>
              ))}
            </p>
          ) : null}
        </div>
        {groups.filter((g) => g.links.length).map((g) => (
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
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">© {new Date().getFullYear()} {s.store.name}. {t("footer.rights")} · <ConsentLink className="underline hover:text-white" />{s.i18n.switcher && langs.length > 1 ? <LangSwitch langs={langs} current={t.locale} path={path} /> : null}</span>
          {/* Kartla ödeme gerçekten hazırsa (anahtarlar girilmiş) sağlayıcı adı yazılır */}
          {cardReady(s) ? <span>{t("footer.secure", { saglayici: s.payment.provider === "paytr" ? "PayTR" : "iyzico" })}</span> : null}
        </div>
      </div>
    </footer>
  );
}
