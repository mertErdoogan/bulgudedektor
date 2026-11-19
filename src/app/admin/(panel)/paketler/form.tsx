"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { formatTL } from "@/lib/utils";
import { saveBundle } from "./actions";

type Opt = { id: string; name: string; price: number; stock: number };
type Item = { productId: string; quantity: number };
export type BundleInput = {
  id: string;
  name: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
  items: Item[];
};
const d = (x: Date | null | undefined) => (x ? new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function BundleForm({ bundle: b, products, translations }: { bundle?: BundleInput; products: Opt[]; translations: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>(b?.items.length ? b.items : [{ productId: "", quantity: 1 }, { productId: "", quantity: 1 }]);
  const [type, setType] = useState<"PERCENT" | "FIXED">(b?.discountType ?? "PERCENT");
  const [value, setValue] = useState(String(b?.discountValue ?? 10));
  const pm = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const setPrice = items.reduce((s, i) => s + (pm.get(i.productId)?.price ?? 0) * i.quantity, 0);
  const v = Number(String(value).replace(",", ".")) || 0;
  const discount = setPrice > 0 ? Math.min(setPrice, type === "PERCENT" ? (setPrice * Math.min(v, 90)) / 100 : v) : 0;
  const lowStock = items.filter((i) => i.productId && (pm.get(i.productId)?.stock ?? 0) < i.quantity);
  const update = (k: number, patch: Partial<Item>) => setItems(items.map((x, j) => (j === k ? { ...x, ...patch } : x)));

  return (
    <ActionForm action={saveBundle} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {b ? <input type="hidden" name="id" value={b.id} /> : null}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Paket" description="Müşteri bu ürünlerin hepsini sepete eklediğinde indirim kendiliğinden uygulanır. Paket, içindeki her ürünün sayfasında 'Paketle al' kutusu olarak görünür." />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Paket adı *" className="md:col-span-2" hint="Ürün sayfasında ve sepette görünür">
              <Input name="name" defaultValue={b?.name} required placeholder="Örn. Manticore başlangıç seti" />
            </Field>
            <Field label="Açıklama" className="md:col-span-2" hint="Kısa tut: pakette neden bu ürünler var?">
              <Textarea name="description" defaultValue={b?.description ?? ""} className="min-h-[60px]" placeholder="Dedektör, pinpointer ve kulaklık bir arada: kazıda hedefi saniyede bul." />
            </Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Paketteki ürünler" description="En az 2 farklı ürün. Adet, pakette o üründen kaç tane olduğunu belirtir." />
          <div className="flex flex-col gap-2 p-5" data-testid="bundle-items">
            {items.map((it, k) => (
              <div key={k} className="flex items-center gap-2">
                <Select name="itemProduct" value={it.productId} onChange={(e) => update(k, { productId: e.target.value })} className="min-w-0 flex-1" required>
                  <option value="">Ürün seç…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatTL(p.price)}
                    </option>
                  ))}
                </Select>
                <Input name="itemQty" type="number" min={1} max={20} value={it.quantity} onChange={(e) => update(k, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="w-20" aria-label="Adet" />
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== k))} disabled={items.length <= 2} className="grid h-10 w-10 place-items-center rounded-lg text-mute hover:bg-soft hover:text-danger disabled:opacity-30" aria-label="Ürünü çıkar">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => setItems([...items, { productId: "", quantity: 1 }])}>
              <Plus size={15} /> Ürün ekle
            </Button>
            {lowStock.length ? <p className="rounded-lg bg-warn-bg p-3 text-sm font-semibold text-warn">Stokta yetmeyen ürün var; stok gelene kadar paket ürün sayfalarında gösterilmez.</p> : null}
          </div>
        </Card>
        {translations}
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="İndirim" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="İndirim türü">
              <Select name="discountType" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")}>
                <option value="PERCENT">Paket toplamından yüzde (%)</option>
                <option value="FIXED">Paket toplamından sabit tutar (TL)</option>
              </Select>
            </Field>
            <Field label={type === "PERCENT" ? "İndirim %" : "İndirim tutarı (TL)"}>
              <Input name="discountValue" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} required />
            </Field>
            <dl className="flex flex-col gap-1.5 rounded-xl bg-soft p-4 text-sm" data-testid="bundle-preview">
              <div className="flex justify-between"><dt className="text-mute">Ürünlerin toplamı</dt><dd>{formatTL(setPrice)}</dd></div>
              <div className="flex justify-between text-ok"><dt>Paket indirimi</dt><dd>−{formatTL(discount)}</dd></div>
              <div className="flex justify-between border-t border-line pt-1.5 text-base font-extrabold"><dt>Paket fiyatı</dt><dd>{formatTL(setPrice - discount)}</dd></div>
            </dl>
            <p className="text-xs leading-relaxed text-mute">Paket indirimi kupon ve kampanyalarla birleşmez: sepette müşteri için hangisi fazlaysa o uygulanır. Kargo bedava kampanyaları paketle birlikte geçerlidir.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Yayın" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Başlangıç" hint="Boş = hemen"><Input type="datetime-local" name="startsAt" defaultValue={d(b?.startsAt)} /></Field>
            <Field label="Bitiş" hint="Boş = süresiz"><Input type="datetime-local" name="endsAt" defaultValue={d(b?.endsAt)} /></Field>
            <Field label="Sıra" hint="Bir üründe birden çok paket varsa küçük sayı önce görünür"><Input name="sortOrder" type="number" defaultValue={b?.sortOrder ?? 0} /></Field>
            <Checkbox name="isActive" defaultChecked={b?.isActive ?? true} label="Aktif" />
            <SubmitButton size="lg">Kaydet</SubmitButton>
            <Link href="/admin/paketler" className="text-center text-sm font-semibold text-mute">Vazgeç</Link>
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
