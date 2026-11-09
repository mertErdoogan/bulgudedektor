import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Breadcrumbs, FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { getFaqs, toQA } from "@/lib/content";
import { faqLd, graph, pageMeta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Sık Sorulan Sorular — Metal Dedektörü, Sipariş, Garanti",
  description: "Metal dedektörü seçimi, yasal durum, kargo, taksit, garanti, iade ve servis hakkında en çok sorulan soruların kısa ve net yanıtları.",
  path: "/sss",
});

export default async function FaqPage() {
  const [rows, s] = await Promise.all([getFaqs({ general: true }), getSettings()]);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";
  return (
    <div className="container-x max-w-4xl py-6">
      <JsonLd data={graph(faqLd(toQA(rows)))} />
      <Breadcrumbs items={[{ name: "Sık sorulan sorular", path: "/sss" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">Sık sorulan sorular</h1>
      <p className="mt-2 text-[15px] text-[#3e4440]">Aradığın cevap burada yoksa uzmanımız WhatsApp’tan genellikle 15 dakika içinde yanıtlar.</p>
      {groups.size > 1 ? (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Konular">
          {[...groups.keys()].map((g) => <a key={g} href={`#${encodeURIComponent(g)}`} className="rounded-full border border-line px-4 py-1.5 text-sm font-bold hover:bg-soft">{g}</a>)}
        </nav>
      ) : null}
      <div className="mt-8 flex flex-col gap-10">
        {[...groups.entries()].map(([g, list]) => (
          <FaqSection key={g} id={encodeURIComponent(g)} title={g} items={toQA(list)} schema={false} />
        ))}
        {!rows.length ? <p className="rounded-xl bg-soft p-8 text-center text-mute">Henüz soru eklenmedi.</p> : null}
      </div>
      <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-tint p-5 md:flex-row md:items-center md:justify-between">
        <span><b>Sorunun cevabı yok mu?</b><br /><span className="text-sm text-mute">Cihaz seçimi, sipariş, servis — uzmana sor.</span></span>
        <span className="flex gap-2">
          <a href={wa} target="_blank" className="flex h-11 items-center gap-2 rounded-lg bg-[#25D366] px-4 text-sm font-extrabold text-white"><MessageCircle size={17} /> WhatsApp</a>
          <Link href="/sozluk" className="flex h-11 items-center rounded-lg border border-deep px-4 text-sm font-extrabold">Dedektör sözlüğü</Link>
        </span>
      </div>
    </div>
  );
}
