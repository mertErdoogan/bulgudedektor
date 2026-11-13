import { imgProps } from "@/lib/img";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Coins, Compass, Gem, GitCompare, MessageCircle, Phone, Radar, RotateCcw, ShieldCheck, Store, Waves } from "lucide-react";
import type { PostCard } from "@/lib/content";
import { formatDate } from "@/lib/utils";

/* ───────────────────────── "Hangi dedektör sana göre?" testi ───────────────────────── */

const AMAC = [
  { v: "define", l: "Sikke, takı, define", d: "Tarla, bağ, harabe", I: Coins },
  { v: "altin", l: "Doğal altın", d: "Nugget, maden sahası", I: Gem },
  { v: "sahil", l: "Sahilde kayıp takı", d: "Kum, sığ su, dalış", I: Waves },
  { v: "derin", l: "Büyük ve derin hedef", d: "Görüntüleme, 3D", I: Radar },
] as const;

/**
 * Testin ilk sorusu doğrudan banda taşınır: müşteri bir cevaba tıklayınca test 2. sorudan açılır.
 * Koyu, sakin zemin + ince ızgara deseni; cevap kartları üzerine gelince hafifçe kalkar.
 */
export function WizardBand({ title, subtitle }: { title?: string | null; subtitle?: string | null }) {
  return (
    <section className="container-x mt-12" data-testid="wizard-band">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#141416] text-white">
        <span aria-hidden className="absolute -top-32 -left-24 -z-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(212,46,30,.55),transparent_65%)] blur-2xl" />
        <span aria-hidden className="absolute -right-24 -bottom-40 -z-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(47,86,200,.45),transparent_65%)] blur-2xl" />
        <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,.08)_1px,transparent_1px)] [mask-image:linear-gradient(90deg,transparent,#000_30%,#000_70%,transparent)] bg-[size:22px_22px]" />
        <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1fr_1.35fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11.5px] font-extrabold tracking-[.12em] text-white/85 ring-1 ring-white/15">
              <Compass size={14} /> 1 DAKİKALIK TEST
            </span>
            <h2 className="font-display mt-4 text-[28px] leading-[1.1] font-extrabold tracking-tight md:text-[40px]">{title || "Hangi dedektör sana göre?"}</h2>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-white/70">{subtitle || "6 kısa soru. Sana uygun 3 cihazı nedenleriyle gösterelim; karar vermeden önce uzmana da sorabilirsin."}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/sihirbaz" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[15px] font-extrabold text-deep transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-10px_rgba(255,255,255,.5)]">
                Teste başla <ArrowRight size={17} />
              </Link>
              <span className="flex items-center gap-1.5" aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <span key={i} className={i === 0 ? "h-1.5 w-6 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/30"} />
                ))}
              </span>
            </div>
          </div>
          <div className="rounded-3xl bg-white/[.06] p-4 ring-1 ring-white/12 backdrop-blur md:p-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-extrabold tracking-[.14em] text-white/55">SORU 1 / 6</span>
              <span className="text-[12px] text-white/55">Birini seç, gerisi kolay</span>
            </div>
            <p className="font-display mt-1.5 px-1 text-[20px] font-extrabold">Ne arayacaksın?</p>
            <div data-stagger="" className="mt-4 grid grid-cols-2 gap-2.5">
              {AMAC.map(({ v, l, d, I }) => (
                <Link key={v} href={`/sihirbaz?amac=${v}`} className="group flex flex-col items-start gap-2.5 rounded-2xl bg-white/[.07] p-3 ring-1 ring-white/10 sm:flex-row sm:gap-3 sm:p-3.5 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:text-deep hover:ring-white">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition group-hover:bg-brand">
                    <I size={20} />
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[14px] leading-tight md:text-[15px]">{l}</b>
                    <span className="hidden text-[12px] text-white/60 group-hover:text-mute sm:block">{d}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Uzmana danış ───────────────────────── */

/**
 * Karar anındaki müşteri için: WhatsApp (en hızlı), telefon, karşılaştırma ve showroom.
 * Görüntülü görüşme sözü verilmez (ekibin her arayana ayıracak vakti olmayabilir).
 */
export function ExpertBand({ title, wa, phone, hours }: { title?: string | null; wa: string; phone: string; hours: string }) {
  const tel = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "/iletisim";
  const tiles = [
    { href: wa, ext: true, I: MessageCircle, t: "WhatsApp'tan yaz", d: "Genelde dakikalar içinde yanıt", tone: "bg-[#e9f7ef] text-[#11643a]" },
    { href: tel, ext: false, I: Phone, t: phone || "Bizi arayın", d: hours.split(",")[0] || "Mesai saatlerinde", tone: "bg-[#eef2fd] text-[#1f3b8f]" },
    { href: "/karsilastir", ext: false, I: GitCompare, t: "Yan yana karşılaştır", d: "Modelleri tek tabloda gör", tone: "bg-[#fdf0ee] text-brand" },
    { href: "/iletisim", ext: false, I: Store, t: "Showroom'da dene", d: "Test alanında, elinde", tone: "bg-[#f4f4f5] text-deep" },
  ];
  return (
    <section className="container-x mt-12" data-testid="expert-band">
      <div className="grid gap-5 rounded-[28px] border border-line bg-[linear-gradient(120deg,#ffffff_0%,#fafafa_60%,#fbf3f1_100%)] p-6 md:p-8 lg:grid-cols-[1fr_1.6fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11.5px] font-extrabold tracking-[.12em] text-mute ring-1 ring-line">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" /></span>
            UZMAN DESTEĞİ
          </span>
          <h2 className="font-display mt-3 text-[26px] leading-tight font-extrabold tracking-tight md:text-[32px]">{title && !/kamera|görüntülü/i.test(title) ? title : "Kararsız mı kaldın? Bir uzmana sor."}</h2>
          <p className="mt-2 text-[14.5px] text-mute">Toprağını, bütçeni ve ne aradığını anlat; sana uygun modeli birlikte seçelim. <span className="whitespace-nowrap">{hours}</span></p>
        </div>
        <div data-stagger="" className="grid gap-3 sm:grid-cols-2">
          {tiles.map(({ href, ext, I, t, d, tone }) => (
            <a key={t} href={href} target={ext ? "_blank" : undefined} rel={ext ? "noopener" : undefined} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#d6d6db] hover:shadow-[0_16px_30px_-20px_rgba(20,20,22,.4)] md:p-4">
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition duration-300 group-hover:scale-110 ${tone}`}>
                <I size={21} />
              </span>
              <span className="min-w-0">
                <b className="block truncate text-[14px] md:text-[15px]">{t}</b>
                <span className="block truncate text-[12px] text-mute md:text-[12.5px]">{d}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Güven: seri no + garanti, iade, showroom ───────────────────────── */

export function TrustBand() {
  const cards = [
    { big: "2 YIL", t: "Distribütör garantisi", d: "Faturalı, Türkiye garantili", I: ShieldCheck },
    { big: "14 GÜN", t: "Kolay iade", d: "Hesabından tek tıkla talep", I: RotateCcw },
    { big: "TEST", t: "Showroom'da dene", d: "Test alanında, cihaz elinde", I: Store },
  ];
  return (
    <section data-stagger="" className="container-x mt-12 grid grid-cols-3 gap-2.5 md:gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr]" data-testid="trust-band">
      <form action="/seri-no" className="relative isolate col-span-3 flex flex-col lg:col-span-1 justify-between gap-4 overflow-hidden rounded-[24px] bg-[#141416] p-5 text-white md:p-6">
        <span aria-hidden className="absolute -top-16 -right-10 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,.35),transparent_65%)] blur-xl" />
        <ShieldCheck aria-hidden size={120} strokeWidth={1} className="absolute -right-4 -bottom-6 -z-10 text-white/[.06]" />
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-extrabold tracking-[.12em] text-[#86efac] ring-1 ring-white/10">
            <ShieldCheck size={13} /> ORİJİNALLİK KONTROLÜ
          </span>
          <b className="font-display mt-3 block text-[22px] leading-tight md:text-[24px]">Cihazın orijinal mi?</b>
          <span className="mt-1 block text-[13.5px] text-white/65">Seri numarasını yaz, distribütör kaydını anında gör.</span>
        </div>
        <span className="flex gap-2 rounded-full bg-white/10 p-1.5 ring-1 ring-white/15 focus-within:ring-white/40">
          <input name="no" required placeholder="Seri numarası" aria-label="Seri numarası" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[14.5px] text-white outline-none placeholder:text-white/45" />
          <button className="h-10 shrink-0 rounded-full bg-white px-5 text-[13.5px] font-extrabold text-deep transition hover:bg-[#86efac]">Sorgula</button>
        </span>
      </form>
      {cards.map(({ big, t, d, I }) => (
        <div key={t} className="group relative isolate flex flex-col justify-between gap-3 overflow-hidden rounded-[20px] border border-line bg-white p-3.5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(20,20,22,.4)] md:gap-6 md:rounded-[24px] md:p-6">
          <span aria-hidden className="absolute -right-6 -bottom-8 -z-10 hidden md:grid h-32 w-32 place-items-center rounded-full bg-soft transition duration-500 group-hover:scale-110">
            <I size={44} strokeWidth={1.4} className="-translate-x-3 -translate-y-3 text-[#c9c9cf] transition duration-500 group-hover:text-brand" />
          </span>
          <span className="font-display text-[21px] leading-none font-black tracking-tight md:text-[34px]">{big}</span>
          <span>
            <b className="block text-[12.5px] leading-tight md:text-[15px]">{t}</b>
            <span className="hidden text-[13px] text-mute md:block">{d}</span>
          </span>
        </div>
      ))}
    </section>
  );
}

/* ───────────────────────── Rehberler ───────────────────────── */

const COVER_TONES = [
  "from-[#1d1d1f] via-[#2c2c31] to-[#5a1d16]",
  "from-[#0f1d3d] via-[#1f3b8f] to-[#2f56c8]",
  "from-[#1a2e22] via-[#11643a] to-[#2f8f57]",
  "from-[#2b1a10] via-[#7a4a14] to-[#c08a2a]",
];
const tone = (s: string) => COVER_TONES[[...s].reduce((n, c) => n + c.charCodeAt(0), 0) % COVER_TONES.length];
const minutes = (p: PostCard) => Math.max(2, Math.round((p.words ?? 0) / 200));

function Cover({ p, big }: { p: PostCard; big?: boolean }) {
  return p.coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...imgProps(p.coverImage, big ? [640, 828, 1080] : [384, 640], big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw")} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
  ) : (
    <span aria-hidden className={`absolute inset-0 bg-gradient-to-br ${tone(p.category)}`}>
      <span className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,.09)_1px,transparent_1px)] bg-[size:18px_18px]" />
      <BookOpen size={big ? 120 : 64} strokeWidth={1} className="absolute top-6 right-6 text-white/15 transition duration-700 group-hover:rotate-[-6deg] group-hover:scale-110" />
    </span>
  );
}

/**
 * Ana sayfa rehber vitrini: bir büyük öne çıkan yazı + yanında iki yazı. Başlık görselin üstünde,
 * okuma süresi ve kategori etiketiyle; "tıklayayım" hissi için hareketli kapak.
 */
export function BlogShowcase({ posts }: { posts: PostCard[] }) {
  if (!posts.length) return null;
  const [lead, ...rest] = posts;
  return (
    <section className="container-x mt-14" data-testid="blog-showcase">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <span className="text-[11.5px] font-extrabold tracking-[.14em] text-mute">ARENA REHBER</span>
          <h2 className="font-display mt-1 text-[24px] leading-tight font-extrabold md:text-[32px]">Almadan önce bilmen gerekenler</h2>
        </div>
        <Link href="/blog" className="flex shrink-0 items-center gap-1.5 text-sm font-bold hover:text-brand">Tüm rehberler <ArrowRight size={15} /></Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link href={`/blog/${lead.slug}`} className="group relative isolate flex min-h-[340px] flex-col justify-end overflow-hidden rounded-[26px] p-6 text-white md:min-h-[420px] md:p-8">
          <Cover p={lead} big />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
          <span className="relative flex flex-wrap items-center gap-2 text-[12px] font-bold">
            <span className="rounded-full bg-white px-2.5 py-1 text-deep">{lead.category}</span>
            <span className="flex items-center gap-1 text-white/80"><Clock3 size={13} /> {minutes(lead)} dk okuma</span>
          </span>
          <h3 className="font-display relative mt-3 max-w-xl text-[24px] leading-[1.15] font-extrabold md:text-[32px]">{lead.title}</h3>
          {lead.excerpt ? <p className="relative mt-2 line-clamp-2 max-w-xl text-[14.5px] text-white/75">{lead.excerpt}</p> : null}
          <span className="relative mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[13.5px] font-extrabold ring-1 ring-white/25 backdrop-blur transition group-hover:bg-white group-hover:text-deep">
            Rehberi oku <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </span>
        </Link>
        <div data-stagger="" className="grid gap-4">
          {rest.slice(0, 2).map((p) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className="group grid grid-cols-[150px_minmax(0,1fr)] overflow-hidden rounded-[22px] border border-line bg-white transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_34px_-22px_rgba(20,20,22,.4)] sm:grid-cols-[210px_minmax(0,1fr)]">
              <span className="relative isolate block overflow-hidden">
                <Cover p={p} />
              </span>
              <span className="flex flex-col gap-1.5 p-4 md:p-5">
                <span className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold text-mute">
                  <span className="rounded-full bg-soft px-2 py-0.5 tracking-wide text-deep uppercase">{p.category}</span>
                  <span className="flex items-center gap-1"><Clock3 size={12} /> {minutes(p)} dk</span>
                </span>
                <b className="font-display line-clamp-2 text-[17px] leading-snug group-hover:text-brand md:text-[19px]">{p.title}</b>
                {p.excerpt ? <span className="line-clamp-2 text-[13px] text-mute">{p.excerpt}</span> : null}
                <span className="mt-auto flex items-center justify-between pt-1 text-[12px] text-mute">
                  {formatDate(p.publishedAt ?? p.updatedAt)}
                  <span className="font-extrabold text-deep transition group-hover:translate-x-1">Oku →</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
