import { IfFeature } from "@/components/brand";
import Link from "@/components/locale-link";
import { MessageCircle } from "lucide-react";
import { Breadcrumbs, FaqSection } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { getFaqs, toQA } from "@/lib/content";
import { faqLd, graph, pageMeta } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return pageMeta({ title: t("faqp.meta_title"), description: t("faqp.meta_desc"), path: "/sss" });
}

export default async function FaqPage() {
  const [rows, s, t] = await Promise.all([getFaqs({ general: true }), getSettings(), getT()]);
  const groups = new Map<string, typeof rows>();
  for (const r of rows) groups.set(r.group, [...(groups.get(r.group) ?? []), r]);
  const wa = s.store.whatsapp ? `https://wa.me/${s.store.whatsapp}` : "/iletisim";
  return (
    <div className="container-x max-w-4xl py-6">
      <JsonLd data={graph(faqLd(toQA(rows)))} />
      <Breadcrumbs items={[{ name: t("faqp.title"), path: "/sss" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">{t("faqp.title")}</h1>
      <p className="mt-2 text-[15px] text-[#3f3f46]">{t("faqp.sub")}</p>
      {groups.size > 1 ? (
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={t("faqp.topics")}>
          {[...groups.keys()].map((g) => <a key={g} href={`#${encodeURIComponent(g)}`} className="rounded-full border border-line px-4 py-1.5 text-sm font-bold hover:bg-soft">{g}</a>)}
        </nav>
      ) : null}
      <div className="mt-8 flex flex-col gap-10">
        {[...groups.entries()].map(([g, list]) => (
          <FaqSection key={g} id={encodeURIComponent(g)} title={g} items={toQA(list)} schema={false} />
        ))}
        {!rows.length ? <p className="rounded-xl bg-soft p-8 text-center text-mute">{t("faqp.none")}</p> : null}
      </div>
      <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-tint p-5 md:flex-row md:items-center md:justify-between">
        <span><b>{t("faqp.no_answer")}</b><br /><span className="text-sm text-mute">{t("faqp.ask")}</span></span>
        <span className="flex gap-2">
          <a href={wa} target="_blank" className="flex h-11 items-center gap-2 rounded-lg bg-[#15803d] px-4 text-sm font-extrabold text-white"><MessageCircle size={17} /> WhatsApp</a>
          <IfFeature f="glossary"><Link href="/sozluk" className="flex h-11 items-center rounded-lg border border-deep px-4 text-sm font-extrabold">{t("glp.crumb")}</Link></IfFeature>
        </span>
      </div>
    </div>
  );
}
