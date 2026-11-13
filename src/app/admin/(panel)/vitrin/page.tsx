import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowDown, ArrowUp } from "lucide-react";
import { db } from "@/db";
import { banners, homeSections } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton, DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { SingleImageField } from "@/components/admin/single-image-field";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";
import { deleteBanner, moveSection, saveAnnouncement, saveBanner, saveSection } from "./actions";
import { MerchCard } from "./merch-card";
import { TickerCard } from "./ticker-card";

export const metadata = { title: "Ana sayfa ve banner" };
const PLACE: Record<string, string> = { HERO: "Büyük slider", SIDE: "Kampanya kartları (banner altı, 3 adet)", STRIP: "İnce şerit", CATEGORY: "Kategori sayfası" };
const SECTION: Record<string, string> = {
  WIZARD_BAND: "'Bana hangisi?' bandı",
  CATEGORY_TILES: "Kategori kutuları",
  PRODUCT_TABS: "Ürün listeleri (çok satan / yeni / fırsat / aynı gün)",
  EXPERT_BAND: "Uzmana sor bandı",
  PRODUCT_ROW: "Profesyonel ürün şeridi",
  TRUST: "Güven şeridi + seri no sorgu",
  CATEGORY_RAILS: "Kategori şeritleri (her kategoriden ürünler)",
  BRANDS: "Markaya göre alışveriş (marka kartları)",
};
const dt = (x: Date | null) => (x ? new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function VitrinPage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string }> }) {
  await requireStaff("cms.manage");
  const sp = await searchParams;
  const [bs, secs, s] = await Promise.all([db.select().from(banners).orderBy(asc(banners.placement), asc(banners.sortOrder)), db.select().from(homeSections).orderBy(asc(homeSections.sortOrder)), getSettings()]);
  const edit = sp.id ? bs.find((b) => b.id === sp.id) : undefined;
  const showForm = !!edit || !!sp.yeni;
  const now = new Date();
  return (
    <>
      <PageHeader title="Ana sayfa ve banner" description="Değişiklikler mağazada hemen yayına girer." actions={<Button variant="outline" asChild><Link href="/" target="_blank">Ana sayfayı aç</Link></Button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Duyuru şeridi" description="Sitenin en üstündeki koyu şerit. Maddeleri · ile ayırın." />
            <ActionForm action={saveAnnouncement} className="flex gap-2 p-5">
              <Input name="announcement" defaultValue={s.store.announcement} />
              <SubmitButton variant="outline">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
          <TickerCard />
          <MerchCard />
          <Card>
            <CardHeader title="Bannerlar" action={<Button size="sm" asChild><Link href="/admin/vitrin?yeni=1">+ Banner ekle</Link></Button>} />
            <ul className="divide-y divide-line">
              {bs.map((b) => {
                const live = b.isActive && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt >= now);
                return (
                  <li key={b.id} className={`flex items-center gap-4 px-5 py-3 ${b.id === sp.id ? "bg-tint" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="h-14 w-24 rounded-lg border border-line bg-soft object-cover" />
                    <div className="flex-1 text-sm">
                      <Link href={`/admin/vitrin?id=${b.id}`} className="font-bold hover:text-link">{b.title}</Link>
                      <p className="text-xs text-mute">{PLACE[b.placement]} · sıra {b.sortOrder}{b.endsAt ? ` · bitiş ${formatDate(b.endsAt)}` : ""}</p>
                    </div>
                    {live ? <Badge tone="ok">Yayında</Badge> : <Badge>{b.isActive ? "Zamanlanmış" : "Kapalı"}</Badge>}
                    <DeleteButton run={deleteBanner.bind(null, b.id)} confirmText="Banner silinsin mi?" />
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Ana sayfa bölümleri" description="Oklarla sırala, başlıkları değiştir, istemediğini kapat." />
            <ul className="divide-y divide-line">
              {secs.map((x, i) => (
                <li key={x.id} className="px-5 py-4">
                  <ActionForm action={saveSection} className="grid items-end gap-3 md:grid-cols-[auto_1fr_1fr_90px_auto_auto]">
                    <input type="hidden" name="id" value={x.id} />
                    <div className="flex flex-col">
                      <ActionButton type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} run={moveSection.bind(null, x.id, -1)} aria-label="Yukarı"><ArrowUp size={14} /></ActionButton>
                      <ActionButton type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={i === secs.length - 1} run={moveSection.bind(null, x.id, 1)} aria-label="Aşağı"><ArrowDown size={14} /></ActionButton>
                    </div>
                    <Field label={SECTION[x.type] ?? x.type}><Input name="title" defaultValue={x.title ?? ""} placeholder="Başlık" /></Field>
                    <Field label="Alt başlık"><Input name="subtitle" defaultValue={x.subtitle ?? ""} /></Field>
                    {"limit" in x.config ? <Field label="Ürün sayısı"><Input name="limit" type="number" min={2} max={20} defaultValue={Number(x.config.limit)} /></Field> : <div />}
                    <Checkbox name="isActive" defaultChecked={x.isActive} label="Açık" className="pb-2.5" />
                    <SubmitButton size="sm" variant="outline">Kaydet</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <Card className="self-start">
          {showForm ? (
            <>
              <CardHeader title={edit ? "Banner düzenle" : "Yeni banner"} />
              <div className="mx-5 mt-1 rounded-xl bg-soft p-3 text-[13px] leading-relaxed">
                <b>Büyük slider: 1520×580 px</b> (yatay, ~2,6:1). Görselin <b>tamamı görünür</b>, hiçbir yeri kırpılmaz veya örtülmez; arkasındaki renkli ışık görselin kendi renklerinden otomatik oluşur.
                <span className="mt-1.5 block"><b>Mobil görsel: 1080×608 px</b> (16:9, isteğe bağlı). Girilmezse büyük görsel küçültülür; yazılar telefonda okunmayacak kadar küçülüyorsa mobil görsel ekleyin.</span>
                <span className="mt-1.5 block"><b>Kampanya kartı:</b> beyaz veya şeffaf zeminli ürün fotoğrafı yeterli; beyaz zemin karta karışır.</span>
                <span className="mt-2 flex items-center gap-2 text-mute"><span className="relative block h-[29px] w-[76px] rounded-[5px] bg-deep"><span className="absolute inset-[3px] rounded-[3px] border border-dashed border-white/70" /></span>Önemli yazı ve ürünü kenarlardan biraz içeride tutun (yuvarlak köşeler).</span>
              </div>
              <ActionForm action={saveBanner} key={edit?.id ?? "new"} className="flex flex-col gap-3 p-5">
                {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
                <Field label="Yer">
                  <Select name="placement" defaultValue={edit?.placement ?? "HERO"}>
                    {Object.entries(PLACE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Görsel *"><SingleImageField name="imageUrl" defaultValue={edit?.imageUrl} /></Field>
                <Field label="Mobil görsel (isteğe bağlı)"><SingleImageField name="mobileImageUrl" defaultValue={edit?.mobileImageUrl} /></Field>
                <Field label="Üst etiket"><Input name="eyebrow" defaultValue={edit?.eyebrow ?? ""} placeholder="MINELAB GPZ 8000" /></Field>
                <Field label="Başlık *"><Input name="title" defaultValue={edit?.title} required /></Field>
                <Field label="Alt yazı"><Input name="subtitle" defaultValue={edit?.subtitle ?? ""} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Buton yazısı"><Input name="ctaLabel" defaultValue={edit?.ctaLabel ?? ""} placeholder="İncele" /></Field>
                  <Field label="Sıra"><Input name="sortOrder" type="number" defaultValue={edit?.sortOrder ?? 0} /></Field>
                </div>
                <Field label="Bağlantı" hint="/urun/..., /kategori/... veya tam adres"><Input name="linkUrl" defaultValue={edit?.linkUrl ?? ""} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Başlangıç"><Input type="datetime-local" name="startsAt" defaultValue={dt(edit?.startsAt ?? null)} /></Field>
                  <Field label="Bitiş"><Input type="datetime-local" name="endsAt" defaultValue={dt(edit?.endsAt ?? null)} /></Field>
                </div>
                <Checkbox name="showText" defaultChecked={edit?.showText ?? true} label="Başlık ve butonu görselin üstüne yaz (görselde yazı varsa kapat)" />
                <Checkbox name="isActive" defaultChecked={edit?.isActive ?? true} label="Aktif" />
                <SubmitButton>Kaydet</SubmitButton>
                <Link href="/admin/vitrin" className="text-center text-sm text-mute">Vazgeç</Link>
              </ActionForm>
            </>
          ) : (
            <div className="p-6 text-sm text-mute">Düzenlemek için bir banner seç veya yeni ekle.</div>
          )}
        </Card>
      </div>
    </>
  );
}
