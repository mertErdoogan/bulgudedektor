"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatTL } from "@/lib/utils";
import { createManualOrder, searchProductsForOrder } from "../actions";

type P = { id: string; name: string; sku: string; price: number; stock: number };

export function ManualOrderForm({ maxDiscount }: { maxDiscount: number }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [items, setItems] = useState<(P & { quantity: number })[]>([]);
  const [delivery, setDelivery] = useState("PICKUP");
  const [disc, setDisc] = useState(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => searchProductsForOrder(q.trim()).then(setResults), 250);
    return () => clearTimeout(t);
  }, [q]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <ActionForm action={createManualOrder} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.id, quantity: i.quantity })))} />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Ürünler" />
          <div className="relative p-5">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün adı veya SKU yaz…" />
            {results.length ? (
              <ul className="absolute right-5 left-5 z-10 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={r.stock <= 0}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-soft disabled:opacity-40"
                      onClick={() => {
                        setItems((it) => (it.find((x) => x.id === r.id) ? it.map((x) => (x.id === r.id ? { ...x, quantity: x.quantity + 1 } : x)) : [...it, { ...r, quantity: 1 }]));
                        setQ("");
                      }}
                    >
                      <span>
                        <b>{r.name}</b> <span className="text-mute">{r.sku}</span>
                      </span>
                      <span>
                        {formatTL(r.price)} · <span className={r.stock <= 0 ? "text-danger" : "text-mute"}>{r.stock} stok</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="mt-4 divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="flex-1 font-semibold">{i.name}</span>
                  <Input type="number" min={1} max={i.stock} value={i.quantity} onChange={(e) => setItems(items.map((x) => (x.id === i.id ? { ...x, quantity: Math.max(1, Math.min(i.stock, Number(e.target.value) || 1)) } : x)))} className="h-9 w-20" />
                  <span className="w-28 text-right font-bold">{formatTL(i.price * i.quantity)}</span>
                  <button type="button" onClick={() => setItems(items.filter((x) => x.id !== i.id))} className="p-1.5 text-danger" aria-label="Kaldır">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
              {!items.length ? <li className="py-6 text-center text-sm text-mute">Henüz ürün eklenmedi.</li> : null}
            </ul>
          </div>
        </Card>
        <Card>
          <CardHeader title="Müşteri ve teslimat" description="Telefon numarası kayıtlıysa mevcut müşteriye bağlanır." />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Ad soyad *"><Input name="name" required /></Field>
            <Field label="Telefon *"><Input name="phone" required placeholder="05xx xxx xx xx" /></Field>
            <Field label="E-posta"><Input name="email" type="email" /></Field>
            <Field label="Teslimat">
              <Select name="deliveryMethod" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                <option value="PICKUP">Showroom&apos;da teslim edildi / edilecek</option>
                <option value="CARGO">Kargo ile gönderilecek</option>
              </Select>
            </Field>
            {delivery === "CARGO" ? (
              <>
                <Field label="İl"><Input name="city" required /></Field>
                <Field label="İlçe"><Input name="district" required /></Field>
                <Field label="Adres" className="md:col-span-2"><Textarea name="line" required className="min-h-[60px]" /></Field>
              </>
            ) : null}
          </div>
        </Card>
      </div>
      <Card className="self-start">
        <CardHeader title="Ödeme" />
        <div className="flex flex-col gap-4 p-5">
          <Field label="Ödeme yöntemi">
            <Select name="paymentMethod" defaultValue="TRANSFER">
              <option value="TRANSFER">Havale / EFT</option>
              <option value="CARD">Kart (POS cihazı)</option>
            </Select>
          </Field>
          <Checkbox name="paid" defaultChecked label="Ödeme alındı" />
          <Field label="Kupon kodu"><Input name="coupon" /></Field>
          <Field label={`Satış indirimi % (en fazla %${maxDiscount})`}>
            <Input name="discountPct" type="number" min={0} max={maxDiscount} value={disc} onChange={(e) => setDisc(Math.min(maxDiscount, Math.max(0, Number(e.target.value) || 0)))} disabled={!maxDiscount} />
          </Field>
          <div className="rounded-lg bg-soft p-3 text-sm">
            <div className="flex justify-between"><span>Ara toplam</span><b>{formatTL(subtotal)}</b></div>
            {disc ? <div className="flex justify-between text-ok"><span>İndirim %{disc}</span><span>−{formatTL((subtotal * disc) / 100)}</span></div> : null}
            <p className="mt-1 text-xs text-mute">Kampanya ve kargo ücreti kayıtta otomatik hesaplanır.</p>
          </div>
          <SubmitButton size="lg" disabled={!items.length}>Siparişi oluştur</SubmitButton>
        </div>
      </Card>
    </ActionForm>
  );
}
