"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import type { campaigns } from "@/db/schema";
import { saveCampaign } from "./actions";

type Opt = { id: string; name: string };
const d = (x: Date | null | undefined) => (x ? new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export function CampaignForm({ campaign: c, brands, categories, products }: { campaign?: typeof campaigns.$inferSelect; brands: Opt[]; categories: Opt[]; products: Opt[] }) {
  const [type, setType] = useState(c?.type ?? "PERCENT");
  const [scope, setScope] = useState(c?.scope ?? "ALL");
  const [mode, setMode] = useState(c?.code ? "code" : c ? "auto" : "code");
  const opts = scope === "BRAND" ? brands : scope === "CATEGORY" ? categories : products;
  return (
    <ActionForm action={saveCampaign} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Kampanya" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Kampanya adı *" className="md:col-span-2"><Input name="name" defaultValue={c?.name} required placeholder="Örn. Bahar indirimi" /></Field>
            <Field label="Nasıl uygulanacak?">
              <Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="code">Kupon kodu ile</option>
                <option value="auto">Otomatik (koşulu sağlayan herkese)</option>
              </Select>
            </Field>
            {mode === "code" ? (
              <Field label="Kupon kodu" hint="Büyük harf, boşluksuz"><Input name="code" defaultValue={c?.code ?? ""} required className="font-mono uppercase" placeholder="BAHAR10" /></Field>
            ) : <div />}
            <Field label="İndirim türü">
              <Select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                <option value="PERCENT">Yüzde (%)</option>
                <option value="FIXED">Sabit tutar (TL)</option>
                <option value="FREE_SHIPPING">Kargo bedava</option>
              </Select>
            </Field>
            {type !== "FREE_SHIPPING" ? (
              <Field label={type === "PERCENT" ? "İndirim %" : "İndirim tutarı (TL)"}><Input name="value" inputMode="decimal" defaultValue={c?.value ?? ""} required /></Field>
            ) : <div />}
            <Field label="Açıklama" hint="Sitede ve sepette görünür" className="md:col-span-2"><Textarea name="description" defaultValue={c?.description ?? ""} className="min-h-[60px]" /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Geçerli olduğu ürünler" />
          <div className="flex flex-col gap-4 p-5">
            <Select name="scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="ALL">Tüm ürünler</option>
              <option value="BRAND">Seçili markalar</option>
              <option value="CATEGORY">Seçili kategoriler</option>
              <option value="PRODUCT">Seçili ürünler</option>
            </Select>
            {scope !== "ALL" ? (
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-2">
                {opts.map((o) => (
                  <Checkbox key={o.id} name="targetIds" value={o.id} defaultChecked={c?.targetIds.includes(o.id)} label={o.name} />
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader title="Koşullar ve süre" />
          <div className="flex flex-col gap-4 p-5">
            <Field label="Minimum sepet (TL)"><Input name="minSubtotal" inputMode="decimal" defaultValue={c?.minSubtotal ?? 0} /></Field>
            {type === "PERCENT" ? <Field label="En fazla indirim (TL)" hint="Boş = sınırsız"><Input name="maxDiscount" inputMode="decimal" defaultValue={c?.maxDiscount ?? ""} /></Field> : null}
            <Field label="Başlangıç"><Input type="datetime-local" name="startsAt" defaultValue={d(c?.startsAt)} /></Field>
            <Field label="Bitiş"><Input type="datetime-local" name="endsAt" defaultValue={d(c?.endsAt)} /></Field>
            <Field label="Toplam kullanım limiti" hint="Boş = sınırsız"><Input name="usageLimit" type="number" min={1} defaultValue={c?.usageLimit ?? ""} /></Field>
            <Field label="Müşteri başına limit"><Input name="perCustomerLimit" type="number" min={1} defaultValue={c?.perCustomerLimit ?? ""} /></Field>
            <Checkbox name="isActive" defaultChecked={c?.isActive ?? true} label="Aktif" />
            <Checkbox name="showOnSite" defaultChecked={c?.showOnSite} label="Kampanyalar sayfasında ve ürünlerde göster" />
            <SubmitButton size="lg">Kaydet</SubmitButton>
            <Link href="/admin/kampanyalar" className="text-center text-sm font-semibold text-mute">Vazgeç</Link>
          </div>
        </Card>
      </div>
    </ActionForm>
  );
}
