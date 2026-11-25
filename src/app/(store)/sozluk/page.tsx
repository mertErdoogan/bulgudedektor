import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/json-ld";
import { getGlossary } from "@/lib/content";
import { headingId } from "@/lib/markdown";
import { definedTermSetLd, graph, pageMeta } from "@/lib/seo";
import { getT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const t = await getT();
  return pageMeta({ title: t("glp.meta_title"), description: t("glp.meta_desc"), path: "/sozluk" });
}

const TR_ORDER = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ";

export default async function GlossaryPage() {
  // Sektöre özel modül (Ayarlar > Katalog); kapalıysa sayfa yok
  if (!(await getSettings()).catalog.glossary) notFound();
  const tt = await getT();
  const lc = tt.locale === "en" ? "en" : "tr";
  const terms = (await getGlossary()).map((t) => ({ ...t, id: headingId(t.question) }));
  const letter = (s: string) => s.trim().charAt(0).toLocaleUpperCase(lc === "tr" ? "tr-TR" : "en-GB");
  const groups = new Map<string, typeof terms>();
  for (const t of terms.sort((a, b) => a.question.localeCompare(b.question, lc))) groups.set(letter(t.question), [...(groups.get(letter(t.question)) ?? []), t]);
  const letters = [...groups.keys()].sort((a, b) => (lc === "tr" ? TR_ORDER.indexOf(a) - TR_ORDER.indexOf(b) : a.localeCompare(b, "en")));
  return (
    <div className="container-x max-w-4xl py-6">
      <JsonLd data={graph(definedTermSetLd(terms))} />
      <Breadcrumbs items={[{ name: tt("glp.crumb"), path: "/sozluk" }]} />
      <h1 className="font-display text-[28px] font-extrabold md:text-[36px]">{tt("glp.title")}</h1>
      <p className="mt-2 text-[15px] text-[#3f3f46]">{tt("glp.sub", { n: terms.length })}</p>
      <nav className="mt-5 flex flex-wrap gap-1.5" aria-label={tt("glp.letters")}>
        {letters.map((l) => <a key={l} href={`#harf-${l}`} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-sm font-bold hover:bg-soft">{l}</a>)}
      </nav>
      <div className="mt-8 flex flex-col gap-8">
        {letters.map((l) => (
          <section key={l} id={`harf-${l}`} className="scroll-mt-40">
            <h2 className="font-display mb-2 text-2xl font-extrabold text-brand">{l}</h2>
            <dl className="divide-y divide-line rounded-2xl border border-line">
              {groups.get(l)!.map((t) => (
                <div key={t.id} id={t.id} className="scroll-mt-40 p-4">
                  <dt className="font-bold">{t.question}</dt>
                  <dd className="mt-1 text-[15px] leading-relaxed text-[#3f3f46]">{t.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
