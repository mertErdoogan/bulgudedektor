import { ActionForm, SubmitButton } from "@/components/action-form";
import { Ticker } from "@/components/store/ticker";
import { Card, CardHeader, Checkbox, Input } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import { saveTicker } from "./actions";

const THEMES = [
  ["brand", "Kırmızı", "bg-brand"],
  ["dark", "Siyah", "bg-deep"],
  ["gold", "Sarı", "bg-[#ffcf3d]"],
] as const;

/** Kayan şerit (ana sayfada menü ile banner arası): maddeler, yön, hız, renk + canlı önizleme */
export async function TickerCard() {
  const t = (await getSettings()).ticker;
  // Mevcut maddeler + 2 boş satır (yeni madde eklemek için)
  const rows = [...t.items, { text: "", href: "", highlight: false }, { text: "", href: "", highlight: false }];
  const radio = (name: string, value: string, label: React.ReactNode, checked: boolean) => (
    <label key={value} className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="flex h-10 items-center justify-center gap-2 rounded-lg border-2 border-line bg-white px-3 text-sm font-bold transition peer-checked:border-deep peer-checked:bg-deep peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand">{label}</span>
    </label>
  );
  return (
    <Card>
      <CardHeader title="Kayan şerit" description="Ana sayfada menü ile banner arasında kayan duyuru şeridi. Kampanya, yeni ürün, taksit… Maddelere bağlantı verilebilir; 'öne çıkar' işaretli madde rozet gibi görünür." />
      <div className="border-b border-line px-5 py-4">
        <span className="mb-2 block text-xs font-bold text-mute">Önizleme (kaydedilen hali)</span>
        <div className="overflow-hidden rounded-xl">
          {t.enabled && t.items.length ? <Ticker t={t} /> : <div className="rounded-xl bg-soft p-3 text-sm text-mute">Şerit kapalı ya da boş.</div>}
        </div>
      </div>
      <ActionForm action={saveTicker} className="flex flex-col gap-4 p-5">
        <Checkbox name="enabled" defaultChecked={t.enabled} label="Şeridi göster" />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold">Maddeler</span>
          {rows.map((r, i) => (
            <div key={i} className="grid items-center gap-2 rounded-xl border border-line p-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]">
              <Input name="tText" defaultValue={r.text} maxLength={120} placeholder={i < t.items.length ? "" : "Yeni madde: ör. Yılbaşına özel %10 indirim"} aria-label={`${i + 1}. madde metni`} />
              <Input name="tHref" defaultValue={r.href} placeholder="Bağlantı (isteğe bağlı): /kampanyalar" aria-label={`${i + 1}. madde bağlantısı`} />
              <Checkbox name="tHighlight" value={String(i)} defaultChecked={r.highlight} label="Öne çıkar" />
              {i < t.items.length ? <Checkbox name="tRemove" value={String(i)} label="Sil" /> : <span />}
            </div>
          ))}
          <span className="text-xs text-mute">Daha fazla madde için kaydedin; her kayıttan sonra 2 boş satır daha gelir. En fazla 12 madde.</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <fieldset><legend className="mb-2 text-sm font-bold">Yön</legend><div className="grid grid-cols-2 gap-2">{radio("direction", "ltr", "Soldan sağa →", t.direction === "ltr")}{radio("direction", "rtl", "← Sağdan sola", t.direction === "rtl")}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-bold">Hız</legend><div className="grid grid-cols-3 gap-2">{radio("speed", "slow", "Yavaş", t.speed === "slow")}{radio("speed", "normal", "Normal", t.speed === "normal")}{radio("speed", "fast", "Hızlı", t.speed === "fast")}</div></fieldset>
          <fieldset><legend className="mb-2 text-sm font-bold">Renk</legend><div className="grid grid-cols-3 gap-2">{THEMES.map(([v, l, c]) => radio("theme", v, <><span className={`h-3.5 w-3.5 rounded-full ring-1 ring-black/10 ${c}`} />{l}</>, t.theme === v))}</div></fieldset>
        </div>
        <SubmitButton className="self-start">Kaydet</SubmitButton>
      </ActionForm>
    </Card>
  );
}
