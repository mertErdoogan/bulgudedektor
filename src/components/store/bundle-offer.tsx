"use client";

import Link from "@/components/locale-link";
import { Check, PackagePlus, Plus } from "lucide-react";
import { useState } from "react";
import { useT } from "@/components/i18n";
import { useCart } from "@/components/store/cart";
import { imgUrl } from "@/lib/img";
import { cn, formatTL } from "@/lib/utils";

type Offer = {
  id: string;
  name: string;
  description: string | null;
  items: { productId: string; name: string; slug: string; price: number; image: string | null; quantity: number }[];
  setPrice: number;
  discount: number;
  price: number;
  pct: number;
};

/** Ürün sayfası: "Paketle al" kutusu. Paketin tüm ürünlerini tek tıkla sepete ekler; indirim sepette otomatik uygulanır. */
export function BundleOffers({ offers }: { offers: Offer[] }) {
  const t = useT();
  if (!offers.length) return null;
  return (
    <section className="mt-8 flex flex-col gap-4" data-testid="bundle-offers" aria-label={t("bundle.title")}>
      {offers.map((o) => (
        <BundleCard key={o.id} o={o} />
      ))}
    </section>
  );
}

function BundleCard({ o }: { o: Offer }) {
  const t = useT();
  const { addMany } = useCart();
  const [done, setDone] = useState(false);
  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-white shadow-[0_1px_0_rgba(20,20,22,.03)]" data-testid="bundle-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[linear-gradient(90deg,var(--color-tint),#fff)] px-5 py-3 md:px-7">
        <span className="flex items-center gap-2 text-[15px] font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-white"><PackagePlus size={16} /></span>
          {o.name}
        </span>
        <span className="rounded-full bg-ok-bg px-3 py-1 text-[13px] font-extrabold text-ok">{t("bundle.save", { x: formatTL(o.discount) })}</span>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-center md:p-7">
        <div>
          <ul className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-center sm:gap-2">
            {o.items.map((i, k) => (
              <li key={i.productId} className="contents">
                {k > 0 ? (
                  <span className="hidden h-28 shrink-0 items-center sm:flex" aria-hidden>
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-soft text-mute"><Plus size={16} /></span>
                  </span>
                ) : null}
                <div className="flex items-center gap-3 sm:w-[168px] sm:flex-col sm:text-center">
                  <Link href={`/urun/${i.slug}`} className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[#f6f6f7] p-2 sm:h-28 sm:w-28">
                    {i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imgUrl(i.image, 256)} alt={i.name} className="max-h-full max-w-full object-contain mix-blend-multiply" loading="lazy" />
                    ) : null}
                  </Link>
                  <span className="min-w-0 text-[14px] leading-snug">
                    <Link href={`/urun/${i.slug}`} className="line-clamp-2 font-bold hover:underline">{i.quantity > 1 ? `${i.quantity}× ` : ""}{i.name}</Link>
                    <span className="text-[13px] text-mute">{formatTL(i.price * i.quantity)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {o.description ? <p className="mt-4 text-[14px] leading-relaxed text-mute">{o.description}</p> : null}
        </div>
        <div className="flex flex-col gap-3 rounded-[22px] bg-soft p-4">
          <div>
            <span className="flex items-baseline justify-between gap-2 text-[13px] text-mute">
              {t("bundle.price")}
              <s data-testid="bundle-old">{formatTL(o.setPrice)}</s>
            </span>
            <b className="block text-right text-[26px] leading-tight font-extrabold tracking-tight whitespace-nowrap" data-testid="bundle-price">{formatTL(o.price)}</b>
          </div>
          <button
            type="button"
            onClick={() => {
              addMany(o.items.map((i) => ({ productId: i.productId, quantity: i.quantity })), o.name);
              setDone(true);
              setTimeout(() => setDone(false), 1600);
            }}
            className={cn("flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-extrabold text-white transition hover:-translate-y-0.5", done ? "bg-ok" : "bg-deep hover:bg-black")}
            data-testid="bundle-add"
          >
            {done ? <><Check size={18} strokeWidth={3} /> {t("card.addedLong")}</> : <>{t("bundle.add")} · %{o.pct}</>}
          </button>
          <span className="text-center text-[12px] text-mute">{t("bundle.note")}</span>
        </div>
      </div>
    </div>
  );
}
