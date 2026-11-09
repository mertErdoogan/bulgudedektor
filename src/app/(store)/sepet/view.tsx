"use client";

import { CartUpsell } from "@/components/store/rails";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCart } from "@/components/store/cart";
import { Button, Input } from "@/components/ui";
import type { Quote } from "@/lib/pricing";
import { formatTL } from "@/lib/utils";
import { getCartQuote } from "../actions";

export function CartView({ inst, freeThreshold, flatRate }: { inst: number; freeThreshold: number; flatRate: number }) {
  const { items, setQty, remove, ready } = useCart();
  const [q, setQ] = useState<Quote | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      setApplied(sessionStorage.getItem("bulgu_coupon"));
    } catch {}
  }, []);
  useEffect(() => {
    if (!ready) return;
    start(async () => setQ(await getCartQuote(items, applied)));
  }, [items, applied, ready]);

  if (ready && !items.length)
    return (
      <div className="container-x py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold">Sepetin boş</h1>
        <p className="mt-2 text-mute">Hangi cihazı alacağını bilmiyorsan 6 soruda birlikte bulalım.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild><Link href="/sihirbaz">Bana hangisi?</Link></Button>
          <Button variant="outline" asChild><Link href="/urunler">Ürünlere göz at</Link></Button>
        </div>
      </div>
    );

  const applyCoupon = () => {
    const c = coupon.trim().toUpperCase();
    setApplied(c || null);
    try {
      if (c) sessionStorage.setItem("bulgu_coupon", c);
      else sessionStorage.removeItem("bulgu_coupon");
    } catch {}
  };

  return (
    <div className="container-x py-6 pb-28">
      <h1 className="font-display mb-4 text-2xl font-extrabold">Sepetin</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-3">
          {q?.errors.map((e) => <p key={e} className="rounded-lg bg-warn-bg p-3 text-sm font-semibold text-warn">{e}</p>)}
          {(q?.lines ?? []).map((l) => (
            <div key={l.productId} className="flex gap-3 rounded-xl border border-line p-3">
              <Link href={`/urun/${l.slug}`} className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {l.imageUrl ? <img src={l.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/urun/${l.slug}`} className="font-bold hover:text-link">{l.name}</Link>
                <span className="text-xs text-mute">Birim {formatTL(l.unitPrice)}{l.error ? ` · ${l.error}` : ""}</span>
                <div className="mt-auto flex items-center justify-between gap-2">
                  <div className="flex h-10 items-center rounded-lg border border-[#d6d6d9]">
                    <button className="grid h-full w-10 place-items-center" onClick={() => setQty(l.productId, l.quantity - 1)} aria-label="Azalt"><Minus size={15} /></button>
                    <span className="w-7 text-center font-bold">{l.quantity}</span>
                    <button className="grid h-full w-10 place-items-center disabled:opacity-30" disabled={l.quantity >= l.available} onClick={() => setQty(l.productId, l.quantity + 1)} aria-label="Artır"><Plus size={15} /></button>
                  </div>
                  <b className="font-display text-lg">{formatTL(l.total)}</b>
                  <button onClick={() => remove(l.productId)} className="p-2 text-mute hover:text-danger" aria-label="Sepetten çıkar"><Trash2 size={18} /></button>
                </div>
              </div>
            </div>
          ))}
          {!q && ready ? <div className="h-32 animate-pulse rounded-xl bg-soft" /> : null}
        </div>
        <div className="flex flex-col gap-3 self-start lg:sticky lg:top-6">
          <div className="rounded-2xl border border-line p-5">
            <div className="flex gap-2">
              <Input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Kupon kodu" className="uppercase" />
              <Button variant="outline" onClick={applyCoupon}>Uygula</Button>
            </div>
            {applied && q?.couponError ? <p className="mt-2 text-sm text-danger">{q.couponError}</p> : null}
            {q?.campaign ? <p className="mt-2 text-sm font-bold text-ok">✓ {q.campaign.name} uygulandı</p> : null}
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt>Ara toplam</dt><dd>{formatTL(q?.subtotal)}</dd></div>
              {q?.discountTotal ? <div className="flex justify-between text-ok"><dt>İndirim</dt><dd>−{formatTL(q.discountTotal)}</dd></div> : null}
              <div className="flex justify-between"><dt>Kargo</dt><dd>{q?.shippingTotal ? formatTL(q.shippingTotal) : <span className="font-bold text-ok">Ücretsiz</span>}</dd></div>
              {freeThreshold > 0 && flatRate > 0 && q && q.subtotal < freeThreshold ? <p className="text-xs text-mute">{formatTL(freeThreshold - q.subtotal)} daha ekle, kargo bedava.</p> : null}
              <div className="flex justify-between border-t border-line pt-3 text-lg font-extrabold"><dt>Toplam</dt><dd>{formatTL(q?.total)}</dd></div>
              {inst > 1 && q ? <p className="text-xs text-mute">{inst} ay vade farksız: {formatTL(Math.round(q.total / inst))} × {inst}</p> : null}
            </dl>
            <Button size="lg" className="mt-4 hidden w-full lg:flex" asChild disabled={pending || !q?.lines.length}>
              <Link href="/odeme">Siparişi tamamla</Link>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-xs text-mute"><ShieldCheck size={16} className="text-brand" /> iyzico güvencesi, 3D Secure. Kart bilgin bizde saklanmaz.</p>
        </div>
      </div>
      <CartUpsell className="mt-10 pb-24 lg:pb-0" />
      <div className="fixed inset-x-0 bottom-[60px] z-30 border-t border-line bg-white px-4 py-3 lg:hidden">
        <Button size="lg" className="w-full" asChild>
          <Link href="/odeme">Siparişi tamamla · {formatTL(q?.total)}</Link>
        </Button>
      </div>
    </div>
  );
}
