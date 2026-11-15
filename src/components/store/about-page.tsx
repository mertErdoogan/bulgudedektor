import { and, count, eq } from "drizzle-orm";
import { ArrowRight, BadgeCheck, Clock, Hash, Mail, MapPin, MessageCircle, Navigation, PackageSearch, Phone, ShieldCheck, Sparkles, Store, Wand2, Wrench, BookOpen } from "lucide-react";
import Link from "@/components/locale-link";
import { db } from "@/db";
import { brands, products } from "@/db/schema";
import { BrandMark } from "@/components/store/brand-mark";
import { MapEmbed } from "@/components/store/map-embed";
import { openState } from "@/lib/opening-hours";
import type { AllSettings } from "@/lib/settings";
import type { Locale } from "@/lib/i18n/config";

const TR = {
  eyebrow: "Hakkımızda",
  lead: "Minelab Türkiye yetkili distribütörü. Doğru cihazı birlikte seçer, kutudan çıktıktan sonra da yanınızda oluruz.",
  b1: "Minelab yetkili distribütör",
  b2: "Orijinal · faturalı · garantili",
  b3: "Şişli'de showroom",
  visit: "Showroom'a gel",
  ask: "WhatsApp'tan sor",
  sBrands: "marka",
  sProducts: "aktif ürün",
  sCities: "ile kargo",
  sWarranty: "resmi garanti",
  sYears: "yıllık tecrübe",
  story: "Hikâyemiz",
  doTitle: "Bizde neler yapabilirsin?",
  doSub: "Sayfayı okumakla kalma, hemen işini gör:",
  t1: "Sana uygun cihazı bul",
  t1s: "60 saniyelik sihirbaz",
  t2: "Seri numarası sorgula",
  t2s: "Cihazın orijinal mi?",
  t3: "Teknik servis kaydı",
  t3s: "Arıza, bakım, yedek parça",
  t4: "Siparişini takip et",
  t4s: "Kargon nerede?",
  t5: "Dedektör sözlüğü",
  t5s: "Terimleri öğren",
  brandsTitle: "Sattığımız markalar",
  brandsSub: "Hepsi resmi yollarla ithal, faturalı ve garantili.",
  showroom: "Showroom",
  showroomSub: "Cihazları elinde tart, arazine göre uzmanımızla birlikte seç.",
  open: "Şu an açık",
  until: "{t}'e kadar",
  closed: "Şu an kapalı",
  opens: "Açılış: {t}",
  dir: "Yol tarifi",
  mapCta: "Haritayı göster",
  mapNote: "Harita Google Haritalar'dan yüklenir.",
  wizTitle: "Hangi dedektör sana uygun?",
  wizSub: "Arazini ve aradığın şeyi seç, sana en uygun 3 modeli önerelim.",
  wizCta: "Sihirbazı başlat",
  days: ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"],
};
const EN: typeof TR = {
  eyebrow: "About us",
  lead: "Official Minelab distributor in Türkiye. We help you pick the right detector and stay with you long after it leaves the box.",
  b1: "Official Minelab distributor",
  b2: "Genuine · invoiced · warranty",
  b3: "Showroom in Şişli",
  visit: "Visit the showroom",
  ask: "Ask on WhatsApp",
  sBrands: "brands",
  sProducts: "active products",
  sCities: "provinces shipped",
  sWarranty: "official warranty",
  sYears: "years of experience",
  story: "Our story",
  doTitle: "What can you do here?",
  doSub: "Don't just read — get things done:",
  t1: "Find your detector",
  t1s: "60-second wizard",
  t2: "Check a serial number",
  t2s: "Is your device genuine?",
  t3: "Service request",
  t3s: "Repair, maintenance, parts",
  t4: "Track your order",
  t4s: "Where is your parcel?",
  t5: "Detector glossary",
  t5s: "Learn the terms",
  brandsTitle: "Brands we carry",
  brandsSub: "All officially imported, invoiced and under warranty.",
  showroom: "Showroom",
  showroomSub: "Hold the devices, compare them and choose with our expert.",
  open: "Open now",
  until: "until {t}",
  closed: "Closed now",
  opens: "Opens {t}",
  dir: "Directions",
  mapCta: "Show map",
  mapNote: "The map is loaded from Google Maps.",
  wizTitle: "Which detector suits you?",
  wizSub: "Pick your terrain and target, we'll suggest the 3 best models.",
  wizCta: "Start the wizard",
  days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

const TILES = [
  { href: "/sihirbaz", icon: Wand2, k: "t1", tone: "from-[#fde8e5] to-[#fff5f3] text-[#a3200f]", ring: "bg-[#d42e1e]" },
  { href: "/seri-no", icon: Hash, k: "t2", tone: "from-[#e6efff] to-[#f4f8ff] text-[#1d4ed8]", ring: "bg-[#2563eb]" },
  { href: "/servis", icon: Wrench, k: "t3", tone: "from-[#e3f6ef] to-[#f2fbf7] text-[#0f766e]", ring: "bg-[#0f9f86]" },
  { href: "/siparis-takip", icon: PackageSearch, k: "t4", tone: "from-[#fdf3e2] to-[#fffaf0] text-[#9a5b06]", ring: "bg-[#e08a00]" },
  { href: "/sozluk", icon: BookOpen, k: "t5", tone: "from-[#f1eafe] to-[#f9f5ff] text-[#6d28d9]", ring: "bg-[#7c3aed]" },
] as const;

const fill = (s: string, t: string) => s.replace("{t}", t);

export async function AboutPage({ title, html, settings, locale }: { title: string; html: string; settings: AllSettings; locale: Locale }) {
  const L = locale === "en" ? EN : TR;
  const st = settings.store;
  const [brandRows, [{ n: productCount }]] = await Promise.all([
    db.select({ id: brands.id, name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl }).from(brands).where(eq(brands.isActive, true)).orderBy(brands.sortOrder, brands.name),
    db.select({ n: count() }).from(products).where(and(eq(products.status, "ACTIVE"))),
  ]);
  // Minelab (distribütörü olduğumuz marka) her zaman başta
  const brandList = [...brandRows].sort((a, b) => Number(/minelab/i.test(b.name)) - Number(/minelab/i.test(a.name)));
  const years = st.foundingYear && /^\d{4}$/.test(st.foundingYear) ? new Date().getFullYear() - Number(st.foundingYear) : 0;
  const stats = [
    years > 0 ? { v: `${years}+`, l: L.sYears, c: "text-[#d42e1e]" } : null,
    { v: String(brandList.length), l: L.sBrands, c: "text-[#2563eb]" },
    { v: String(productCount), l: L.sProducts, c: "text-[#0f9f86]" },
    { v: "81", l: L.sCities, c: "text-[#e08a00]" },
    years > 0 ? null : { v: locale === "en" ? "2 yrs" : "2 yıl", l: L.sWarranty, c: "text-[#7c3aed]" },
  ].filter(Boolean) as { v: string; l: string; c: string }[];

  const where = st.latitude && st.longitude ? `${st.latitude},${st.longitude}` : st.address;
  const q = encodeURIComponent(where);
  const os = openState(st.openingHours);
  const wa = st.whatsapp ? `https://wa.me/${st.whatsapp}` : null;

  return (
    <div data-testid="about-page">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-deep text-white">
        {/* radar: tarama ışını + halkalar + birkaç "bulgu" noktası */}
        <div aria-hidden className="pointer-events-none absolute top-1/2 right-[-260px] -z-10 h-[620px] w-[620px] -translate-y-1/2 md:right-[-120px]">
          <span className="radar-sweep absolute inset-0 rounded-full" />
          {[0.3, 0.55, 0.8, 1].map((k) => (
            <span key={k} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" style={{ width: `${k * 100}%`, height: `${k * 100}%` }} />
          ))}
          {[[30, 38, 0], [62, 24, 1.2], [44, 70, 2.1], [72, 60, 0.6]].map(([x, y, d]) => (
            <span key={`${x}${y}`} className="radar-blip absolute h-2.5 w-2.5 rounded-full bg-[#ffb4a8]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
          ))}
        </div>
        <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-brand/30 blur-3xl" />
        <div className="container-x relative py-12 md:py-20">
          <p className="text-xs font-bold tracking-[.2em] text-white/60 uppercase">{L.eyebrow}</p>
          <h1 className="font-display mt-2 max-w-2xl text-[34px] leading-[1.05] font-extrabold md:text-6xl">{st.name || title}</h1>
          <p className="mt-4 max-w-xl text-[15px] text-white/75 md:text-lg">{L.lead}</p>
          <ul className="mt-5 flex flex-wrap gap-2 text-[12.5px] font-semibold">
            {[
              [BadgeCheck, L.b1],
              [ShieldCheck, L.b2],
              [Store, L.b3],
            ].map(([I, t], i) => {
              const Icon = I as typeof BadgeCheck;
              return (
                <li key={i} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur">
                  <Icon className="h-4 w-4 text-[#ffb4a8]" /> {t as string}
                </li>
              );
            })}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#showroom" className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(212,46,30,.9)] transition hover:bg-brand-dark">
              <MapPin className="h-4 w-4" /> {L.visit}
            </a>
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-deep transition hover:bg-soft">
                <MessageCircle className="h-4 w-4 text-[#11643a]" /> {L.ask}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* SAYILAR */}
      <div className="container-x relative z-10 -mt-8 md:-mt-10">
        <ul className="grid grid-cols-2 gap-2.5 rounded-[22px] border border-line bg-white p-2.5 shadow-[0_24px_50px_-30px_rgba(20,20,22,.45)] md:grid-cols-4 md:gap-3 md:p-3" data-testid="about-stats">
          {stats.slice(0, 4).map((s) => (
            <li key={s.l} className="rounded-2xl bg-soft px-4 py-4 text-center md:py-5">
              <b className={`font-display block text-3xl font-extrabold md:text-4xl ${s.c}`}>{s.v}</b>
              <span className="text-xs font-semibold text-mute md:text-sm">{s.l}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* HİKÂYE + İŞLEVSEL KISAYOLLAR */}
      <section className="container-x grid gap-6 py-12 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:py-16">
        <div className="rounded-[22px] border border-line bg-white p-6 md:p-8">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[.16em] text-brand uppercase">
            <Sparkles className="h-4 w-4" /> {L.story}
          </p>
          <div className="prose-lite about-prose mt-2" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
        <div>
          <h2 className="font-display text-2xl font-extrabold">{L.doTitle}</h2>
          <p className="mt-1 text-sm text-mute">{L.doSub}</p>
          <ul className="mt-4 grid gap-2.5" data-testid="about-actions">
            {TILES.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className={`group flex items-center gap-3 rounded-2xl bg-gradient-to-r p-3.5 transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(20,20,22,.45)] ${t.tone}`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition group-hover:rotate-[-6deg] ${t.ring}`}>
                    <t.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-[15px] text-deep">{L[t.k]}</b>
                    <span className="text-xs">{L[`${t.k}s` as keyof typeof TR] as string}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MARKALAR */}
      {brandList.length ? (
        <section className="container-x pb-12 md:pb-16">
          <h2 className="font-display text-2xl font-extrabold">{L.brandsTitle}</h2>
          <p className="mt-1 text-sm text-mute">{L.brandsSub}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5" data-testid="about-brands">
            {brandList.map((b, i) => (
              <li key={b.id}>
                <Link href={`/marka/${b.slug}`} className={`flex h-full items-center gap-3 rounded-2xl border bg-white p-3 transition hover:-translate-y-0.5 hover:border-[#d0d0d4] hover:shadow-[0_14px_30px_-20px_rgba(20,20,22,.45)] ${i === 0 && /minelab/i.test(b.name) ? "border-brand/40 ring-2 ring-brand/10" : "border-line"}`}>
                  <BrandMark name={b.name} logoUrl={b.logoUrl} size={40} />
                  <b className="truncate text-sm">{b.name}</b>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* SHOWROOM + HARİTA */}
      <section id="showroom" className="scroll-mt-28 bg-soft py-12 md:py-16">
        <div className="container-x grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          <div className="flex flex-col gap-3 rounded-[22px] border border-line bg-white p-6">
            <h2 className="font-display text-2xl font-extrabold">{L.showroom}</h2>
            <p className="text-sm text-mute">{L.showroomSub}</p>
            {os ? (
              <p className={`flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${os.open ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`} data-testid="about-open">
                <span className={`relative h-2 w-2 rounded-full ${os.open ? "bg-ok" : "bg-warn"}`}>{os.open ? <span className="absolute inset-0 animate-ping rounded-full bg-ok" /> : null}</span>
                {os.open ? `${L.open} · ${fill(L.until, os.until ?? "")}` : `${L.closed}${os.next ? ` · ${fill(L.opens, `${os.nextDay != null ? `${L.days[os.nextDay]} ` : ""}${os.next}`)}` : ""}`}
              </p>
            ) : null}
            <ul className="mt-1 flex flex-col gap-2.5 text-sm">
              {st.address ? (
                <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{st.address}</span></li>
              ) : null}
              {st.workingHours ? (
                <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <span>{st.workingHours}</span></li>
              ) : null}
              {st.phone ? (
                <li className="flex gap-3"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a className="font-semibold hover:underline" href={`tel:${st.phone.replace(/\s/g, "")}`}>{st.phone}</a></li>
              ) : null}
              {st.email ? (
                <li className="flex gap-3"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" /> <a className="font-semibold hover:underline" href={`mailto:${st.email}`}>{st.email}</a></li>
              ) : null}
            </ul>
            {where ? (
              <div className="mt-2 flex flex-wrap gap-2" data-testid="about-directions">
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener" className="inline-flex items-center gap-2 rounded-full bg-deep px-4 py-2.5 text-sm font-bold text-white hover:bg-black">
                  <Navigation className="h-4 w-4" /> {L.dir} · Google
                </a>
                <a href={`https://maps.apple.com/?daddr=${q}`} target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-line px-4 py-2.5 text-sm font-bold hover:bg-soft">Apple</a>
                <a href={`https://yandex.com.tr/harita/?text=${q}`} target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-line px-4 py-2.5 text-sm font-bold hover:bg-soft">Yandex</a>
              </div>
            ) : null}
            {wa ? (
              <a href={wa} target="_blank" rel="noopener" className="mt-1 flex items-center gap-3 rounded-xl bg-[#e9f9ef] p-3.5 text-sm font-bold text-[#11643a]">
                <MessageCircle className="h-5 w-5" /> {L.ask}
                <ArrowRight className="ml-auto h-4 w-4" />
              </a>
            ) : null}
          </div>
          {where ? <MapEmbed query={st.latitude && st.longitude ? where : `${st.name}, ${st.address}`} label={`${st.name} — ${L.showroom}`} cta={L.mapCta} note={L.mapNote} /> : null}
        </div>
      </section>

      {/* SİHİRBAZ ÇAĞRISI */}
      <section className="container-x py-12 md:py-16">
        <div className="relative isolate flex flex-col items-start gap-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#d42e1e] to-[#8f1b10] p-7 text-white md:flex-row md:items-center md:p-10">
          <span aria-hidden className="radar-sweep pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full opacity-60" />
          <div className="flex-1">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">{L.wizTitle}</h2>
            <p className="mt-1 text-white/80">{L.wizSub}</p>
          </div>
          <Link href="/sihirbaz" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-deep hover:bg-soft">
            <Wand2 className="h-4 w-4 text-brand" /> {L.wizCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
