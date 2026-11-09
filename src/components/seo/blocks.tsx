import Link from "next/link";
import { ChevronDown, Sparkles } from "lucide-react";
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
    <div className="answer-box rounded-2xl border-l-4 border-brand bg-tint p-4 md:p-5">
      <p className="mb-1 flex items-center gap-1.5 text-[12px] font-extrabold tracking-wider text-brand uppercase">
        <Sparkles size={14} /> {title}
      </p>
      <div className="text-[15.5px] leading-relaxed text-deep">{children}</div>
      {updated ? <p className="mt-2 text-[12px] text-mute">Son güncelleme: {updated}</p> : null}
    </div>
  );
}

/** Görünür SSS listesi + FAQPage şeması. Cevaplar HTML'de açık durur (details içinde de indekslenir). */
export function FaqSection({ items, title = "Sık sorulan sorular", id = "sss", schema = true, className = "" }: { items: { q: string; a: string }[]; title?: string; id?: string; schema?: boolean; className?: string }) {
  if (!items.length) return null;
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
            <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-[#3e4440]">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
