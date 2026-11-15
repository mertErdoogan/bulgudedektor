import Link from "@/components/locale-link";
import { Plus, ChevronDown, Sparkles } from "lucide-react";
import { breadcrumbLd, faqLd, graph } from "@/lib/seo";
import { JsonLd } from "./json-ld";

/** Görünür breadcrumb + BreadcrumbList şeması (aynı veri, tek kaynak). */
export function Breadcrumbs({ items, className = "mb-3" }: { items: { name: string; path: string }[]; className?: string }) {
  return (
    <>
      <JsonLd data={graph(breadcrumbLd(items))} />
      <nav className={`text-[13px] text-mute ${className}`} aria-label="Konum">
        <ol className="flex flex-wrap items-center gap-x-1">
          <li><Link href="/">Ana sayfa</Link></li>
          {items.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              <span aria-hidden>/</span>
              {i === items.length - 1 ? <span aria-current="page" className="text-deep/80">{c.name}</span> : <Link href={c.path}>{c.name}</Link>}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

/**
 * "Kısa cevap" kutusu — AI Overviews / ChatGPT / Perplexity'nin alıntılamayı sevdiği
 * 40–60 kelimelik doğrudan yanıt. Sayfanın en üstünde, ilk paragraf olarak durur.
 */
export function AnswerBox({ title = "Kısa cevap", children, updated }: { title?: string; children: React.ReactNode; updated?: string }) {
  return (
    <div className="answer-box rounded-2xl border border-line bg-[#fafafa] p-4 md:p-5">
      <p className="mb-1.5 flex items-center gap-1.5 text-[14px] font-extrabold text-deep">
        <Sparkles size={14} className="text-brand" /> {title}
      </p>
      <div className="text-[15.5px] leading-relaxed text-deep">{children}</div>
      {updated ? <p className="mt-2 text-[12px] text-mute">Son güncelleme: {updated}</p> : null}
    </div>
  );
}

/** Görünür SSS listesi + FAQPage şeması. Cevaplar HTML'de açık durur (details içinde de indekslenir). */
export function FaqSection({ items, title = "Sık sorulan sorular", id = "sss", schema = true, className = "", variant = "list" }: { items: { q: string; a: string }[]; title?: string; id?: string; schema?: boolean; className?: string; variant?: "list" | "cards" }) {
  if (!items.length) return null;
  if (variant === "cards")
    return (
      <section id={id} className={`scroll-mt-40 ${className}`}>
        {schema ? <JsonLd data={graph(faqLd(items))} /> : null}
        <span className="inline-flex items-center rounded-full bg-soft px-3 py-1 text-[11px] font-extrabold tracking-[.14em] text-mute">SIK SORULANLAR</span>
        <h2 className="font-display mt-3 mb-5 text-[24px] leading-tight font-extrabold">{title}</h2>
        <div className="flex flex-col gap-2.5">
          {items.map((f, i) => (
            <details key={i} className="group rounded-2xl border border-line bg-white px-4 py-3.5 transition open:border-transparent open:bg-soft open:shadow-[inset_0_0_0_1px_rgba(20,20,22,.04)] md:px-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center gap-3 font-bold [&::-webkit-details-marker]:hidden">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-deep text-[12px] font-extrabold text-white tabular-nums group-open:bg-brand">{i + 1}</span>
                <h3 className="min-w-0 flex-1 text-[15px] md:text-[15.5px]">{f.q}</h3>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-soft transition group-open:rotate-45 group-open:bg-white"><Plus size={16} /></span>
              </summary>
              <p className="mt-2.5 pl-10 text-[14.5px] leading-relaxed whitespace-pre-line text-[#3f3f46]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    );
  return (
    <section id={id} className={`scroll-mt-40 ${className}`}>
      {schema ? <JsonLd data={graph(faqLd(items))} /> : null}
      <h2 className="font-display mb-3 text-2xl font-extrabold">{title}</h2>
      <div className="divide-y divide-line rounded-2xl border border-line">
        {items.map((f, i) => (
          <details key={i} className="group p-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 font-bold [&::-webkit-details-marker]:hidden">
              <h3 className="text-[15.5px]">{f.q}</h3>
              <ChevronDown size={18} className="mt-0.5 shrink-0 text-mute transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-[#3f3f46]">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
