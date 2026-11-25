import { Check, PackageOpen } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Select, Textarea } from "@/components/ui";
import { imgUrl } from "@/lib/img";
import type { UnitGroup } from "@/lib/returns";
import { formatTL } from "@/lib/utils";
import { requestReturn } from "@/app/(store)/hesabim/actions";

/** Müşteri iade formu: her cihaz / her adet ayrı seçilir. Zaten iade sürecindeki adet seçilemez. */
export function ReturnForm({ orderId, groups, daysLeft }: { orderId: string; groups: UnitGroup[]; daysLeft: number }) {
  const free = groups.flatMap((g) => g.units.filter((u) => !u.taken));
  return (
    <ActionForm action={requestReturn} className="flex flex-col gap-4 rounded-3xl border-2 border-brand bg-white p-5 shadow-[0_10px_40px_-20px_color-mix(in_srgb,var(--color-brand)_45%,transparent)] sm:p-6" data-testid="return-form">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint text-brand"><PackageOpen size={20} /></span>
        <div>
          <b className="text-lg">Neyi iade etmek istiyorsun?</b>
          <p className="text-sm text-mute">Her cihazı ayrı seçebilirsin; seçmediklerin sende kalır. İade hakkının bitmesine <b className="text-deep">{daysLeft} gün</b> var.</p>
        </div>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">İade edilecek ürünler</legend>
        {groups.map((g) => (
          <div key={g.item.id} className="rounded-2xl bg-soft p-3">
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {g.item.imageUrl ? <img src={imgUrl(g.item.imageUrl, 128)} alt="" className="h-11 w-11 rounded-lg bg-white object-contain p-1" /> : null}
              <span className="flex-1 text-sm">
                <b>{g.item.name}</b>
                <span className="block text-xs text-mute">{g.item.quantity} adet · adedi {formatTL(g.item.unitPrice)}</span>
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.units.map((u) => (
                <label
                  key={u.key}
                  className={`group flex items-center gap-2.5 rounded-xl border-2 bg-white px-3 py-2.5 text-sm transition ${u.taken ? "cursor-not-allowed border-transparent opacity-55" : "cursor-pointer border-line hover:border-deep/40 has-[:checked]:border-brand has-[:checked]:bg-tint"}`}
                >
                  <input type="checkbox" name="unit" value={u.key} disabled={u.taken} defaultChecked={!u.taken && free.length === 1} className="peer sr-only" data-testid="return-unit" />
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-line text-white peer-checked:border-brand peer-checked:bg-brand">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <span className="flex-1">
                    <span className={u.serial ? "font-mono text-[13px]" : "font-semibold"}>{u.label}</span>
                    {u.taken ? <span className="block text-xs font-bold text-warn">Zaten iade sürecinde</span> : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sebep">
          <Select name="reason" required defaultValue="">
            <option value="" disabled>Seç</option>
            <option>Beklentimi karşılamadı</option>
            <option>Yanlış ürün seçtim</option>
            <option>Kusurlu / hasarlı geldi</option>
            <option>Başka yerden daha uygununu buldum</option>
            <option>Diğer</option>
          </Select>
        </Field>
        <Field label="Açıklama (isteğe bağlı)"><Textarea name="details" className="min-h-[44px]" /></Field>
      </div>
      <ul className="grid gap-1.5 rounded-2xl bg-soft p-3 text-[13px] text-mute sm:grid-cols-3">
        <li><b className="block text-deep">1. Talep</b>1 iş günü içinde inceleriz.</li>
        <li><b className="block text-deep">2. Ücretsiz kargo</b>Kodla kutusu ve aksesuarlarıyla gönderirsin.</li>
        <li><b className="block text-deep">3. Para iadesi</b>Ürün kontrol edilince ödediğin yönteme iade.</li>
      </ul>
      <SubmitButton className="self-start">İade talebini gönder</SubmitButton>
    </ActionForm>
  );
}
