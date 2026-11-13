import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, products } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { imgUrl } from "@/lib/img";
import { activePins, WEIGHT_LABEL, WEIGHT_SHARE } from "@/lib/merch";
import { getSettings, type MerchWeight } from "@/lib/settings";
import { bestSellers } from "@/lib/store";
import { saveMerch } from "./actions";

const WEIGHTS: MerchWeight[] = ["off", "light", "balanced", "high"];

/**
 * Vitrin önceliği kartı: dağıtıcısı olunan marka raflarda ağırlıklı görünür; dönemsel ürünler sabitlenir.
 * Önizleme, ana sayfadaki "Çok satanlar" rafının şu anki halini gösterir (kaydettikten sonra güncellenir).
 */
export async function MerchCard() {
  const s = await getSettings();
  const m = s.merch;
  const [bs, list, preview] = await Promise.all([
    db.select({ slug: brands.slug, name: brands.name }).from(brands).where(eq(brands.isActive, true)).orderBy(asc(brands.sortOrder)),
    db
      .select({ id: products.id, name: products.name, brand: brands.name, brandSlug: brands.slug })
      .from(products)
      .leftJoin(brands, eq(brands.id, products.brandId))
      .where(eq(products.status, "ACTIVE"))
      .orderBy(asc(brands.name), asc(products.name)),
    bestSellers(8),
  ]);
  const name = (id: string) => {
    const p = list.find((x) => x.id === id);
    return p ? `${p.brand ? `${p.brand} ` : ""}${p.name}` : "Bulunamayan ürün";
  };
  const live = new Set(activePins(m));
  const focusName = bs.find((b) => b.slug === m.focusBrand)?.name;
  const focusCount = preview.filter((p) => p.brandSlug === m.focusBrand).length;
  // Öncelikli marka ürünleri listede önce
  const options = [...list].sort((a, b) => Number(b.brandSlug === m.focusBrand) - Number(a.brandSlug === m.focusBrand));

  return (
    <Card>
      <CardHeader title="Raflarda marka ağırlığı" description="Çok satanlar, yeni gelenler, fırsatlar, kategori şeritleri, benzer modeller ve kategorilerdeki 'Önerilen' sıralama buna göre dolar. Arama sonuçları ve müşterinin seçtiği sıralamalar (fiyat, en yeni) tarafsız kalır." />
      <ActionForm action={saveMerch} className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Field label="Öncelikli marka">
            <Select name="focusBrand" defaultValue={m.focusBrand}>
              <option value="">— Yok (tüm raflar tarafsız) —</option>
              {bs.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </Select>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Ağırlık</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEIGHTS.map((w) => (
                <label key={w} className="cursor-pointer">
                  <input type="radio" name="weight" value={w} defaultChecked={m.weight === w} className="peer sr-only" />
                  <span className="flex h-16 flex-col items-center justify-center rounded-xl border-2 border-line bg-white text-sm font-bold transition peer-checked:border-deep peer-checked:bg-deep peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                    {WEIGHT_LABEL[w]}
                    <span className="text-xs font-semibold opacity-70">{WEIGHT_SHARE[w] == null ? "satışa göre" : `~%${Math.round(WEIGHT_SHARE[w]! * 100)}`}</span>
                  </span>
                </label>
              ))}
            </div>
            <span className="text-xs text-mute">Örn. “Dengeli”: 8 ürünlük rafta 6 öncelikli marka, 2 diğer marka (3. ve 6. sırada). Diğer markalar hiçbir ayarda tamamen gizlenmez.</span>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold">Banner altındaki 3 kart</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ["latest", "En yeni cihazlar (otomatik)", "Öncelikli markanın en yeni 3 cihazı. Sabitlenen ürün varsa önce o."],
                ["banners", "Kampanya kartları (elle)", "Aşağıdaki banner listesinden 'Kampanya kartları' yerindekiler."],
              ] as const).map(([v, l, d]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name="heroCards" value={v} defaultChecked={m.heroCards === v} className="peer sr-only" />
                  <span className="flex h-full flex-col gap-0.5 rounded-xl border-2 border-line bg-white p-3 text-sm font-bold transition peer-checked:border-deep peer-focus-visible:ring-2 peer-focus-visible:ring-brand">
                    {l}
                    <span className="text-xs font-normal text-mute">{d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Marka kartındaki not" hint="Sözleşmedeki ifadeyle aynı olmalı. Boşsa gösterilmez."><Input name="focusNote" defaultValue={m.focusNote} maxLength={60} placeholder="Türkiye distribütörü" /></Field>
            <Checkbox name="badge" defaultChecked={m.badge} label="Ürün sayfasında 'Distribütör garantili' rozeti" className="sm:pt-7" />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">Sabitlenen ürünler <span className="font-normal text-mute">— rafların başında durur (en fazla 6). Yeni çıkan cihaz, dönem kampanyası için.</span></span>
            {m.pinned.length ? (
              <ul className="flex flex-col gap-2">
                {m.pinned.map((p) => (
                  <li key={p.productId} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2 pl-3 text-sm">
                    <input type="hidden" name="pinId" value={p.productId} />
                    <b className="min-w-0 flex-1 truncate">{name(p.productId)}</b>
                    {!live.has(p.productId) ? <span className="rounded bg-warn-bg px-2 py-0.5 text-xs font-bold text-warn">Süresi doldu</span> : null}
                    <label className="flex items-center gap-1.5 text-xs text-mute">bitiş <Input type="date" name="pinUntil" defaultValue={p.until ?? ""} className="h-9 w-[150px]" /></label>
                    <Checkbox name="pinRemove" value={p.productId} label="Kaldır" />
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
              <Select name="pinAdd" defaultValue="" aria-label="Sabitlenecek ürün">
                <option value="">+ Ürün sabitle…</option>
                {options.map((p) => <option key={p.id} value={p.id}>{p.brand ? `${p.brand} · ` : ""}{p.name}</option>)}
              </Select>
              <Input type="date" name="pinAddUntil" aria-label="Sabitleme bitiş tarihi (isteğe bağlı)" />
            </div>
          </div>
          <SubmitButton className="self-start">Kaydet</SubmitButton>
        </div>
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-soft p-4">
          <b className="text-sm">Şu an: “Çok satanlar” rafı</b>
          <span className="text-sm text-mute">
            {focusName ? <>8 üründen <b className="text-deep">{focusCount}</b> tanesi {focusName}</> : "Öncelik kapalı: raf yalnızca satışa göre"}
          </span>
          <ol className="grid grid-cols-4 gap-2" data-testid="merch-preview">
            {preview.map((p, i) => (
              <li key={p.id} className="flex flex-col gap-1 rounded-lg bg-white p-1.5">
                <span className="relative block h-14">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image ? <img src={imgUrl(p.image, 96)} alt="" className="h-full w-full object-contain mix-blend-multiply" /> : null}
                  <span className="absolute top-0 left-0 grid h-5 w-5 place-items-center rounded-full bg-brand text-[10px] font-extrabold text-white">{i + 1}</span>
                </span>
                <span className={`text-[10px] font-extrabold ${p.brandSlug === m.focusBrand ? "text-link" : "text-mute"}`}>{p.brand?.toLocaleUpperCase("en-US")}</span>
                <span className="line-clamp-2 text-[11px] leading-tight font-semibold">{p.name}</span>
              </li>
            ))}
          </ol>
          <a href="/" target="_blank" className="text-sm font-bold text-link">Ana sayfada gör →</a>
        </div>
      </ActionForm>
    </Card>
  );
}
