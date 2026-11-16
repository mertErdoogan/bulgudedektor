"use client";

import { CityDistrict } from "@/components/city-district";
import { useEffect, useState } from "react";
import { Banknote, CreditCard, Landmark, ScanLine, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatTL } from "@/lib/utils";
import { createManualOrder, inStockSerials, searchProductsForOrder } from "../actions";

type P = { id: string; name: string; sku: string; price: number; stock: number; trackSerial: boolean };
type Line = P & { quantity: number; serials: string[]; options: string[] };
type Pay = "CASH" | "CARD" | "TRANSFER";

const PAY: { v: Pay; label: string; icon: typeof Banknote }[] = [
  { v: "CASH", label: "Nakit", icon: Banknote },
  { v: "CARD", label: "Kart (POS)", icon: CreditCard },
  { v: "TRANSFER", label: "Havale / EFT", icon: Landmark },
];

export function ManualOrderForm({ maxDiscount, canConfirmTransfer }: { maxDiscount: number; canConfirmTransfer: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [items, setItems] = useState<Line[]>([]);
  const [delivery, setDelivery] = useState("PICKUP");
  const [pay, setPay] = useState<Pay>("CARD");
  const [paid, setPaid] = useState(true);
  const [handover, setHandover] = useState(true);
  const [disc, setDisc] = useState(0);
  const [discTried, setDiscTried] = useState(0);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => searchProductsForOrder(q.trim()).then(setResults), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Havale seçilince "ödeme alındı" kendiliğinden kalkar: para hesaba geçmeden "ödendi" görünmesin
  const choosePay = (v: Pay) => {
    setPay(v);
    if (v === "TRANSFER") {
      setPaid(false);
      setHandover(false);
    } else setPaid(true);
  };

  const add = async (r: P) => {
    const existing = items.find((x) => x.id === r.id);
    if (existing) setItems(items.map((x) => (x.id === r.id ? { ...x, quantity: Math.min(x.stock, x.quantity + 1) } : x)));
    else {
      const options = r.trackSerial ? await inStockSerials(r.id) : [];
      setItems((it) => [...it, { ...r, quantity: 1, serials: [""], options }]);
    }
    setQ("");
  };

  const setQty = (id: string, n: number) =>
    setItems(items.map((x) => (x.id === id ? { ...x, quantity: n, serials: Array.from({ length: n }, (_, k) => x.serials[k] ?? "") } : x)));
  const setSerial = (id: string, k: number, v: string) => setItems(items.map((x) => (x.id === id ? { ...x, serials: x.serials.map((s, i) => (i === k ? v.toUpperCase() : s)) } : x)));

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const serialsMissing = items.filter((i) => i.trackSerial).reduce((s, i) => s + i.serials.filter((x) => !x.trim()).length, 0);
  const transferLocked = pay === "TRANSFER" && !canConfirmTransfer;
  const canHandover = delivery === "PICKUP" && paid;

  return (
    <ActionForm action={createManualOrder} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" data-testid="manual-order">
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ productId: i.id, quantity: i.quantity, serials: i.trackSerial ? i.serials.filter(Boolean) : [] })))} />
      <input type="hidden" name="paymentMethod" value={pay} />
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Ürünler" description="Seri numaralı cihazda seri numarasını şimdi okut: garanti bugünden başlar, sonra ayrıca işlem gerekmez." />
          <div className="relative p-5">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ürün adı veya stok kodu yaz…" data-testid="product-search" />
            {results.length ? (
              <ul className="absolute right-5 left-5 z-10 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={r.stock <= 0}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-soft disabled:opacity-40"
                      onClick={() => add(r)}
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
                <li key={i.id} className="py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex-1 font-semibold">{i.name}</span>
                    <Input type="number" min={1} max={i.stock} value={i.quantity} onChange={(e) => setQty(i.id, Math.max(1, Math.min(i.stock, Number(e.target.value) || 1)))} className="h-9 w-20" aria-label="Adet" />
                    <span className="w-28 text-right font-bold">{formatTL(i.price * i.quantity)}</span>
                    <button type="button" onClick={() => setItems(items.filter((x) => x.id !== i.id))} className="p-1.5 text-danger" aria-label="Kaldır">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {i.trackSerial ? (
                    <div className="mt-2 grid gap-2 rounded-lg bg-soft p-2.5 sm:grid-cols-2">
                      <datalist id={`sn-${i.id}`}>
                        {i.options.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                      {i.serials.map((s, k) => (
                        <label key={k} className="flex items-center gap-2">
                          <ScanLine size={16} className="shrink-0 text-mute" />
                          <Input
                            value={s}
                            onChange={(e) => setSerial(i.id, k, e.target.value)}
                            list={`sn-${i.id}`}
                            placeholder={`${k + 1}. cihazın seri no (okut ya da seç)`}
                            className={`h-9 font-mono ${s && !i.options.includes(s) ? "border-danger" : ""}`}
                            data-testid="serial-input"
                          />
                        </label>
                      ))}
                      {!i.options.length ? <p className="text-xs font-semibold text-danger sm:col-span-2">Bu ürünün stokta kayıtlı seri numarası yok. Önce Stok sayfasından mal girişi yapılmalı.</p> : null}
                    </div>
                  ) : null}
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
            <Field label="E-posta" hint="Varsa yaz: sipariş ve garanti bilgisi e-postayla gider."><Input name="email" type="email" /></Field>
            <Field label="Teslimat">
              <Select name="deliveryMethod" value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                <option value="PICKUP">Showroom&apos;da teslim</option>
                <option value="CARGO">Kargo ile gönderilecek</option>
              </Select>
            </Field>
            {delivery === "CARGO" ? (
              <>
                <CityDistrict />
                <Field label="Adres" className="md:col-span-2"><Textarea name="line" required className="min-h-[60px]" /></Field>
              </>
            ) : null}
          </div>
        </Card>
      </div>
      <Card className="self-start">
        <CardHeader title="Ödeme" />
        <div className="flex flex-col gap-4 p-5">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ödeme yöntemi">
            {PAY.map((p) => (
              <button
                key={p.v}
                type="button"
                role="radio"
                aria-checked={pay === p.v}
                onClick={() => choosePay(p.v)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-bold transition ${pay === p.v ? "border-brand bg-brand/5 text-brand" : "border-line hover:bg-soft"}`}
                data-testid={`pay-${p.v}`}
              >
                <p.icon size={20} /> {p.label}
              </button>
            ))}
          </div>
          {transferLocked ? (
            <p className="rounded-lg bg-warn-bg p-2.5 text-xs font-semibold text-warn">Havale onayını yöneticin verir. Sipariş &quot;ödeme bekleniyor&quot; olarak açılır; para hesaba geçince yöneticin onaylar.</p>
          ) : (
            <Checkbox name="paid" checked={paid} onChange={(e) => setPaid(e.currentTarget.checked)} label={pay === "TRANSFER" ? "Havale hesaba geçti (kontrol ettim)" : pay === "CASH" ? "Nakit kasaya alındı" : "POS'tan çekim yapıldı"} />
          )}
          {delivery === "PICKUP" ? (
            <Checkbox
              name="handover"
              checked={handover && canHandover}
              disabled={!canHandover}
              onChange={(e) => setHandover(e.currentTarget.checked)}
              label={<>Cihaz müşteriye <b>elden teslim edildi</b> <span className="text-mute">· satış tek adımda biter</span></>}
            />
          ) : null}
          {handover && canHandover && serialsMissing ? <p className="text-xs font-semibold text-warn">Elden teslim için {serialsMissing} seri numarası daha okutulmalı.</p> : null}
          <Field label="Kupon kodu"><Input name="coupon" /></Field>
          <Field label={maxDiscount ? `Satış indirimi % (senin limitin %${maxDiscount})` : "Satış indirimi"}>
            <Input
              name="discountPct"
              type="number"
              min={0}
              max={maxDiscount}
              value={disc}
              onChange={(e) => {
                const raw = Math.max(0, Number(e.target.value) || 0);
                setDiscTried(raw);
                setDisc(Math.min(maxDiscount, raw));
              }}
              disabled={!maxDiscount}
            />
          </Field>
          {!maxDiscount ? <p className="-mt-2 text-xs text-mute">İndirim yetkin yok. Gerekirse yöneticin Ekip sayfasından limit tanımlar.</p> : null}
          {discTried > maxDiscount && maxDiscount ? <p className="-mt-2 text-xs font-semibold text-warn">En fazla %{maxDiscount} indirim yapabilirsin; daha fazlası için yöneticine sor.</p> : null}
          <div className="rounded-lg bg-soft p-3 text-sm">
            <div className="flex justify-between"><span>Ara toplam</span><b>{formatTL(subtotal)}</b></div>
            {disc ? <div className="flex justify-between text-ok"><span>Satış indirimi %{disc}</span><span>−{formatTL((subtotal * disc) / 100)}</span></div> : null}
            <p className="mt-1 text-xs text-mute">Kampanya ve kargo ücreti kayıtta otomatik hesaplanır.</p>
          </div>
          <SubmitButton size="lg" disabled={!items.length}>{handover && canHandover ? "Satışı tamamla" : "Siparişi oluştur"}</SubmitButton>
        </div>
      </Card>
    </ActionForm>
  );
}
