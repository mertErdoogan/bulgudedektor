"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { AddToCart } from "@/components/store/bits";
import { cn, formatTL } from "@/lib/utils";
import { recommend, type Answers, type Pick } from "./actions";

type Q = { key: keyof Answers; title: string; hint?: string; opts: { v: string; l: string; d?: string }[] };
const QS: Q[] = [
  { key: "amac", title: "Ne arayacaksın?", opts: [{ v: "define", l: "Sikke, takı, define", d: "Tarla, bağ, harabe" }, { v: "altin", l: "Doğal altın", d: "Nugget, maden sahası" }, { v: "sahil", l: "Sahilde kayıp takı", d: "Kum, sığ su, dalış" }, { v: "derin", l: "Büyük ve derin hedef", d: "Görüntüleme, 3D" }, { v: "pointer", l: "Kazıda nokta tespiti", d: "Pointer" }] },
  { key: "seviye", title: "Deneyimin ne?", opts: [{ v: "BEGINNER", l: "İlk cihazım" }, { v: "INTERMEDIATE", l: "Daha önce kullandım" }, { v: "PRO", l: "Profesyonelim" }] },
  { key: "butce", title: "Bütçen ne kadar?", opts: [{ v: "0-25", l: "25 bin TL'ye kadar" }, { v: "25-60", l: "25–60 bin TL" }, { v: "60-150", l: "60–150 bin TL" }, { v: "150+", l: "150 bin TL üstü" }] },
  { key: "toprak", title: "Arayacağın yerin toprağı nasıl?", hint: "Bilmiyorsan sorun değil: \"Emin değilim\" de.", opts: [{ v: "normal", l: "Normal tarla, park", d: "Kahverengi, taşsız toprak" }, { v: "demirli", l: "Kırmızı, demirli toprak", d: "Karadeniz, Ege dağlık bölgeler; mineral yoğun" }, { v: "sahil", l: "Sahil ve ıslak kum", d: "Tuzlu su, dalga kıyısı" }, { v: "emin-degil", l: "Emin değilim", d: "İkisine de uygun cihazları gösterelim" }] },
  { key: "agirlik", title: "Gün boyu taşıyacak mısın?", opts: [{ v: "onemli", l: "Evet, hafif olsun" }, { v: "farketmez", l: "Fark etmez" }] },
  { key: "su", title: "Suya girecek mi?", opts: [{ v: "hayir", l: "Hayır" }, { v: "kiyi", l: "Kıyıda, sığ suda" }, { v: "dalis", l: "Evet, dalış yapacağım" }] },
];

export function Wizard({ initialAmac, whatsapp }: { initialAmac?: string; whatsapp: string }) {
  const [a, setA] = useState<Partial<Answers>>(initialAmac ? { amac: initialAmac } : {});
  const [step, setStep] = useState(initialAmac ? 1 : 0);
  const [res, setRes] = useState<{ picks: Pick[]; total: number } | null>(null);
  const [pending, start] = useTransition();
  const q = QS[step];

  const choose = (v: string) => {
    const next = { ...a, [q.key]: v };
    setA(next);
    if (step < QS.length - 1) setStep(step + 1);
    else start(async () => setRes(await recommend(next as Answers)));
  };

  if (res) {
    const summary = QS.map((x) => x.opts.find((o) => o.v === a[x.key])?.l).filter(Boolean).join(" · ");
    const waText = encodeURIComponent(`Merhaba, sihirbazda şunları seçtim: ${summary}. Önerilenler: ${res.picks.map((p) => p.p.name).join(", ")}. Yardımcı olur musunuz?`);
    return (
      <div className="container-x max-w-5xl py-8">
        <h1 className="font-display text-2xl font-extrabold md:text-3xl">Sana {res.picks.length} önerimiz var</h1>
        <p className="mt-1 text-sm text-mute">{summary} · <button onClick={() => { setRes(null); setStep(0); }} className="font-bold text-link">Cevapları değiştir</button></p>
        {res.picks.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {res.picks.map((x, i) => (
              <article key={x.p.id} className={cn("flex flex-col overflow-hidden rounded-2xl border bg-white", i === 0 ? "border-2 border-brand" : "border-line")}>
                <div className={cn("px-4 py-2 text-xs font-extrabold tracking-wide", i === 0 ? "bg-brand text-white" : "text-link")}>{x.label}</div>
                <Link href={`/urun/${x.p.slug}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {x.p.image ? <img src={x.p.image} alt={x.p.name} className="h-48 w-full object-contain p-4" /> : null}
                </Link>
                <div className="flex flex-1 flex-col gap-2 px-4 pb-4 text-sm">
                  <Link href={`/urun/${x.p.slug}`} className="text-lg font-extrabold hover:text-link">{x.p.name}</Link>
                  <b className="font-display text-xl">{formatTL(x.p.price)}</b>
                  <p><b>Neden sana uygun:</b> {x.why.join("; ")}.</p>
                  {x.caveat ? <p className="rounded-lg bg-[#fff4f2] p-2.5 text-[#7a2a20]"><b>Bunu bekleme:</b> {x.caveat}</p> : null}
                  <div className="mt-auto flex flex-col gap-2 pt-2">
                    <AddToCart productId={x.p.id} name={x.p.name} disabled={x.p.stock <= 0 && !x.p.allowBackorder} />
                    <Link href={`/urun/${x.p.slug}`} className="text-center text-sm font-bold text-link">İncele →</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-soft p-6">Bu seçimlere tam uyan cihaz bulamadık. Bir uzmanla konuşalım; seçeneklerini birlikte netleştirelim.</p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {whatsapp ? <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" className="flex h-12 items-center gap-2 rounded-lg bg-[#25D366] px-5 font-extrabold text-white"><MessageCircle size={18} /> Sonucu uzmana gönder</a> : null}
          <Link href={`/urunler?amac=${a.amac}`} className="flex h-12 items-center rounded-lg border border-deep px-5 font-extrabold">Tüm uygun cihazlar ({res.total})</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x max-w-2xl py-8 pb-28">
      <div className="flex items-center justify-between text-sm font-bold text-mute">
        <span>Soru {step + 1} / {QS.length}</span>
        <Link href="/">Çık ×</Link>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1">{QS.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-line")} />)}</div>
      <h1 className="font-display mt-8 text-[26px] leading-tight font-extrabold md:text-3xl">{q.title}</h1>
      {q.hint ? <p className="mt-1 text-sm text-mute">{q.hint}</p> : null}
      <div className="mt-6 flex flex-col gap-2.5">
        {q.opts.map((o) => (
          <button key={o.v} onClick={() => choose(o.v)} disabled={pending} className={cn("flex items-center gap-3 rounded-xl border-[1.5px] p-4 text-left hover:border-brand", a[q.key] === o.v ? "border-brand bg-tint" : "border-line")}>
            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-2", a[q.key] === o.v ? "border-brand" : "border-[#b8bec7]")}>{a[q.key] === o.v ? <span className="h-2.5 w-2.5 rounded-full bg-brand" /> : null}</span>
            <span><b className="text-[15.5px]">{o.l}</b>{o.d ? <span className="block text-sm text-mute">{o.d}</span> : null}</span>
          </button>
        ))}
      </div>
      {step > 0 ? (
        <Button variant="ghost" className="mt-5" onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Geri</Button>
      ) : null}
      {pending ? <p className="mt-4 text-sm font-bold text-link">Sana uygun cihazlar seçiliyor…</p> : null}
    </div>
  );
}
