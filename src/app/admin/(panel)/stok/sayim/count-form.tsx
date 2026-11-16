"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { Badge, Card, CardHeader, Field, Select, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/action";
import { reconcileSerials, setSerialStatus } from "../actions";

type Result = { expected: number; found: number; missing: { id: string; serial: string; product: string }[]; unknown: string[]; odd: { serial: string; status: string; product: string }[] };
const ST: Record<string, string> = { SOLD: "Satılmış", RESERVED: "Ayrılmış", RETURNED: "İade", IN_SERVICE: "Serviste", DEFECTIVE: "Arızalı", LOST: "Kayıp", IN_STOCK: "Başka ürünün stoğunda" };

export function CountForm({ products }: { products: { id: string; name: string; stock: number }[] }) {
  const [res, setRes] = useState<Result | null>(null);
  const [lost, setLost] = useState<string[]>([]);
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="self-start">
        <CardHeader title="1. Okut" />
        <ActionForm action={reconcileSerials} resetOnSuccess={false} onDone={(r: ActionResult) => { setRes(r.data as Result); setLost([]); }} className="flex flex-col gap-4 p-5" data-testid="count-form">
          <Field label="Hangi ürünler?" hint="Tek ürün sayıyorsan seç; tüm rafı sayıyorsan boş bırak.">
            <Select name="productId" defaultValue="">
              <option value="">Tüm seri numaralı ürünler</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.stock} stokta)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Okutulan seri numaraları" hint="Her satıra bir seri no. Barkod okuyucu her okumada alt satıra geçer.">
            <Textarea name="serials" className="min-h-[260px] font-mono" placeholder={"3820-0009-2001\n3820-0009-2002"} />
          </Field>
          <SubmitButton pendingText="Karşılaştırılıyor…">Karşılaştır</SubmitButton>
          <p className="text-xs text-mute">Karşılaştırma hiçbir kaydı değiştirmez. Değişiklik yalnızca sağdaki listeden tek tek &quot;Kayıp&quot; dediğinde olur.</p>
        </ActionForm>
      </Card>

      <Card className="self-start">
        <CardHeader title="2. Sonuç" description={res ? `${res.found} / ${res.expected} cihaz rafta bulundu` : "Okutup karşılaştırınca burada görünür."} />
        {res ? (
          <div className="flex flex-col gap-5 p-5 text-sm" data-testid="count-result">
            {!res.missing.length && !res.unknown.length && !res.odd.length ? <p className="rounded-xl bg-ok-bg p-4 font-bold text-ok">Sayım tutuyor. Sistemdeki tüm cihazlar rafta.</p> : null}
            {res.missing.length ? (
              <section>
                <h3 className="mb-2 font-bold text-danger">Sistemde stokta ama rafta yok ({res.missing.length})</h3>
                <p className="mb-2 text-xs text-mute">Önce depo, servis rafı ve vitrinde ara. Satılıp sisteme girilmemiş olabilir: o zaman Telefon / showroom siparişi ile satışı gir. Gerçekten yoksa &quot;Kayıp&quot; olarak işaretle (stoktan düşer, sahibe haftalık özette bildirilir).</p>
                <ul className="divide-y divide-line rounded-xl border border-line" data-testid="count-missing">
                  {res.missing.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span>
                        <b className="font-mono">{m.serial}</b> <span className="text-mute">· {m.product}</span>
                      </span>
                      {lost.includes(m.id) ? (
                        <Badge tone="danger">Kayıp işaretlendi</Badge>
                      ) : (
                        <ActionButton size="sm" variant="danger-ghost" run={async () => { const r = await setSerialStatus(m.id, "LOST"); if (r.ok) setLost((x) => [...x, m.id]); return r; }} confirmText={`${m.serial} kayıp olarak işaretlensin mi? Stoktan düşer ve işlem kaydına yazılır.`}>
                          Kayıp
                        </ActionButton>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {res.odd.length ? (
              <section>
                <h3 className="mb-2 font-bold text-warn">Rafta ama sistemde stokta değil ({res.odd.length})</h3>
                <p className="mb-2 text-xs text-mute">Satılmış görünen cihaz raftaysa satış iptal/iade edilmiş ama sisteme işlenmemiş olabilir. Siparişi kontrol et.</p>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {res.odd.map((o) => (
                    <li key={o.serial} className="flex justify-between px-3 py-2"><span><b className="font-mono">{o.serial}</b> <span className="text-mute">· {o.product}</span></span><Badge tone="warn">{ST[o.status] ?? o.status}</Badge></li>
                  ))}
                </ul>
              </section>
            ) : null}
            {res.unknown.length ? (
              <section>
                <h3 className="mb-2 font-bold text-warn">Sistemde hiç kayıtlı değil ({res.unknown.length})</h3>
                <p className="mb-2 text-xs text-mute">Mal girişi yapılmamış cihaz ya da okutma hatası. Doğruysa Stok sayfasından ilgili ürüne mal girişi yap.</p>
                <p className="rounded-xl border border-line p-3 font-mono">{res.unknown.join(", ")}</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
