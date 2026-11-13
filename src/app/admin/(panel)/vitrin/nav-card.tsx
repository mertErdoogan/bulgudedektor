import { ActionForm, SubmitButton } from "@/components/action-form";
import { SingleImageField } from "@/components/admin/single-image-field";
import { Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { saveNav } from "./actions";

const ICONS = [
  ["", "Görsel / otomatik"],
  ["star", "Yıldız"],
  ["trend", "Yükselen ok"],
  ["flame", "Alev"],
  ["tag", "Etiket"],
  ["sparkles", "Parıltı"],
] as const;

/**
 * Header ve ana sayfa kısayolları:
 * - "Ne arıyorsun?" yuvarlak kısayolları (görsel, ad, link, sıra)
 * - Minelab menüsünün sağındaki kampanya kartı
 */
export async function NavCard() {
  const n = (await getSettings()).nav;
  const rows = [...n.shortcuts, ...Array.from({ length: 2 }, () => ({ label: "", href: "", image: "", icon: "" as const, featured: false }))];
  return (
    <Card>
      <CardHeader
        title="Kısayollar ve menü kartı"
        description="'Ne arıyorsun?' bölümündeki yuvarlak kısayollar. Görsel boş bırakılırsa kategori görseli ya da marka logosu kullanılır; o da yoksa ikon ya da marka adı yazılır. Sıra: küçük sayı önce."
      />
      <ActionForm action={saveNav} className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={i} className="grid items-start gap-2 rounded-xl border border-line p-3 md:grid-cols-[110px_minmax(0,1fr)]">
              <div className="flex flex-col gap-1">
                <SingleImageField name="sImage" defaultValue={r.image || null} />
              </div>
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_150px_70px]">
                <Input name="sLabel" defaultValue={r.label} maxLength={28} placeholder={i < n.shortcuts.length ? "" : "Yeni kısayol: ör. Haftanın Ürünü"} aria-label={`${i + 1}. kısayol adı`} />
                <Input name="sHref" defaultValue={r.href} placeholder="/kategori/pointer" aria-label={`${i + 1}. kısayol bağlantısı`} />
                <Select name="sIcon" defaultValue={r.icon} aria-label={`${i + 1}. kısayol ikonu`}>
                  {ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
                <Input name="sOrder" type="number" defaultValue={i + 1} aria-label={`${i + 1}. kısayol sırası`} />
                <div className="flex flex-wrap gap-4 md:col-span-4">
                  <Checkbox name="sFeatured" value={String(i)} defaultChecked={r.featured} label="Kırmızı halka ile öne çıkar" />
                  {i < n.shortcuts.length ? <Checkbox name="sRemove" value={String(i)} label="Sil" /> : null}
                </div>
              </div>
            </div>
          ))}
          <span className="text-xs text-mute">En fazla 12 kısayol. Her kayıttan sonra 2 boş satır daha gelir.</span>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <legend className="px-1 text-sm font-bold">Minelab menüsündeki kampanya kartı</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {(
              [
                ["auto", "Otomatik (sitede gösterilen ilk kampanya)"],
                ["custom", "Elle"],
                ["off", "Gösterme"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" name="pMode" value={v} defaultChecked={n.promo.mode === v} className="accent-brand" /> {l}
              </label>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Üst yazı (elle)"><Input name="pEyebrow" defaultValue={n.promo.eyebrow} maxLength={30} placeholder="KASIM'A ÖZEL" /></Field>
            <Field label="Başlık (elle)"><Input name="pTitle" defaultValue={n.promo.title} maxLength={90} placeholder="40.000 TL üzeri Minelab'da 1.500 TL indirim" /></Field>
            <Field label="Bağlantı (elle)"><Input name="pHref" defaultValue={n.promo.href} placeholder="/kampanyalar" /></Field>
          </div>
          <Field label="Görsel (boşsa en yeni model)"><SingleImageField name="pImage" defaultValue={n.promo.image || null} /></Field>
        </fieldset>
        <SubmitButton className="self-start">Kaydet</SubmitButton>
      </ActionForm>
    </Card>
  );
}
