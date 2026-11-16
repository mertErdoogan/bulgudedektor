import Link from "@/components/locale-link";
import { CheckCircle2, ChevronDown, CircleDot, History, PackageCheck, Plus, ShieldCheck, Truck, Wrench } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input, Textarea } from "@/components/ui";
import type { serialNumbers, serviceRecords } from "@/db/schema";
import { imgUrl } from "@/lib/img";
import { SERVICE_STATUS_LABEL, formatDate, formatTL, serviceNo } from "@/lib/utils";
import { requestService } from "./actions";

type Service = typeof serviceRecords.$inferSelect;
type Device = { s: typeof serialNumbers.$inferSelect; name: string; image: string | null; orderId: string };

/** Müşterinin gördüğü 5 aşama; parça bekleme "tamirde" aşamasının içinde sayılır */
const STAGES = [
  { label: "Kayıt", match: ["RECEIVED", "AWAITING_DEVICE"], icon: CircleDot },
  { label: "Tamirde", match: ["IN_REPAIR", "WAITING_PART"], icon: Wrench },
  { label: "Hazır", match: ["READY"], icon: PackageCheck },
  { label: "Yolda", match: ["SHIPPED_BACK"], icon: Truck },
  { label: "Teslim", match: ["CLOSED"], icon: CheckCircle2 },
];
const NEXT: Record<string, string> = {
  RECEIVED: "Kaydın alındı. Ücretsiz kargo kodunu SMS ile göndereceğiz.",
  AWAITING_DEVICE: "Cihazını ücretsiz kargo koduyla gönder. Arızayla ilgisi yoksa aksesuarları göndermene gerek yok.",
  IN_REPAIR: "Teknisyen cihazınla ilgileniyor. Genelde 3–7 iş günü sürer.",
  WAITING_PART: "Gereken parça sipariş edildi; gelince tamire devam edilecek.",
  READY: "Cihazın hazır, kargoya veriyoruz.",
  SHIPPED_BACK: "Cihazın kargoda, sana geliyor.",
};
const stageOf = (status: string) => STAGES.findIndex((s) => s.match.includes(status));
const lastNote = (x: Service) => [...x.history].reverse().find((h) => h.note)?.note;
const closedAt = (x: Service) => [...x.history].reverse().find((h) => h.status === "CLOSED")?.at;

function OpenCard({ x, fresh }: { x: Service; fresh: boolean }) {
  const cur = stageOf(x.status);
  return (
    <article id={`srv-${x.id}`} className={`scroll-mt-24 rounded-3xl border-2 p-5 ${fresh ? "border-ok bg-ok-bg/40" : "border-brand/40 bg-tint/60"}`} data-testid="service-open">
      <div className="flex flex-wrap items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand text-white"><Wrench size={20} /></span>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold tracking-wide text-mute">{serviceNo(x.number)} · {formatDate(x.createdAt)} tarihinde açıldı</span>
          <b className="block text-lg leading-snug">{x.productName}</b>
          {x.serial ? <span className="font-mono text-xs text-mute">Seri no {x.serial}</span> : null}
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-brand">{SERVICE_STATUS_LABEL[x.status]}</span>
      </div>
      <ol className="mt-5 grid grid-cols-5 gap-1.5">
        {STAGES.map((st, i) => {
          const Icon = st.icon;
          return (
            <li key={st.label} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${i <= cur ? "bg-brand" : "bg-line"}`} />
              <span className={`flex items-center gap-1 text-[11px] font-bold ${i <= cur ? "text-deep" : "text-mute"}`}>
                <Icon size={12} className="hidden shrink-0 sm:block" />
                {st.label}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 rounded-2xl bg-white p-3.5 text-sm"><b>Şimdi ne olacak?</b> <span className="text-mute">{NEXT[x.status] ?? ""}</span></p>
      <p className="mt-2 text-sm text-mute"><b className="text-deep">Bildirdiğin arıza:</b> {x.issue}</p>
      {lastNote(x) ? <p className="mt-1 text-sm text-mute"><b className="text-deep">Servisten son not:</b> {lastNote(x)}</p> : null}
      {x.cost && !x.underWarranty ? <p className="mt-1 text-sm font-bold">Ücret: {formatTL(x.cost)}</p> : x.underWarranty ? <p className="mt-1 flex items-center gap-1 text-sm font-bold text-ok"><ShieldCheck size={15} /> Garanti kapsamında, ücretsiz</p> : null}
      <Timeline x={x} />
    </article>
  );
}

function Timeline({ x }: { x: Service }) {
  return (
    <details className="group mt-3 text-sm">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-bold text-link">
        Tüm adımlar ({x.history.length}) <ChevronDown size={15} className="transition group-open:rotate-180" />
      </summary>
      <ol className="mt-3 flex flex-col gap-2">
        {x.history.map((h, i) => (
          <li key={i} className="border-l-2 border-brand pl-3">
            <b>{SERVICE_STATUS_LABEL[h.status]}</b> <span className="text-xs text-mute">{formatDate(h.at, true)}</span>
            {h.note ? <p className="text-mute">{h.note}</p> : null}
          </li>
        ))}
      </ol>
    </details>
  );
}

function NewForm({ devices, busy, preselect, whatsapp }: { devices: Device[]; busy: Map<string, Service>; preselect: string | null; whatsapp: string | null }) {
  const free = devices.filter((d) => !busy.has(d.s.serial));
  const chosen = preselect ?? (free.length === 1 ? free[0].s.serial : null);
  return (
    <ActionForm action={requestService} className="flex flex-col gap-5 rounded-3xl border-2 border-deep/10 bg-white p-5 sm:p-6 [&:has(input[value=other]:checked)_.other-device]:grid" data-testid="service-form">
      <div>
        <b className="text-lg">1. Hangi cihazında sorun var?</b>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {devices.map(({ s, name, image }) => {
            const open = busy.get(s.serial);
            const warranty = s.warrantyUntil && s.warrantyUntil.getTime() > Date.now();
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 text-sm transition ${open ? "cursor-not-allowed border-transparent bg-soft opacity-60" : "cursor-pointer border-line hover:border-deep/30 has-[:checked]:border-brand has-[:checked]:bg-tint"}`}
              >
                <input type="radio" name="device" value={s.serial} disabled={!!open} defaultChecked={!open && chosen === s.serial} className="accent-[var(--color-brand)]" data-testid="service-device" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {image ? <img src={imgUrl(image, 128)} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-1" /> : null}
                <span className="min-w-0 flex-1">
                  <b className="block leading-snug">{name}</b>
                  <span className="block font-mono text-[11.5px] text-mute">{s.serial}</span>
                  {open ? (
                    <span className="text-[11.5px] font-bold text-warn">Zaten serviste · {serviceNo(open.number)}</span>
                  ) : (
                    <span className={`text-[11.5px] font-bold ${warranty ? "text-ok" : "text-mute"}`}>{warranty ? `Garantili · ${formatDate(s.warrantyUntil)}'e kadar` : "Garanti süresi bitmiş"}</span>
                  )}
                </span>
              </label>
            );
          })}
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed border-line p-3 text-sm hover:border-deep/30 has-[:checked]:border-brand has-[:checked]:bg-tint">
            <input type="radio" name="device" value="other" defaultChecked={!devices.length} className="accent-[var(--color-brand)]" />
            <span>
              <b className="block">Listede yok</b>
              <span className="text-[11.5px] text-mute">Başka yerden aldığın veya hesabına bağlı olmayan cihaz</span>
            </span>
          </label>
        </div>
        <div className="other-device mt-3 hidden gap-3 sm:grid-cols-2">
          <Field label="Cihaz modeli"><Input name="productName" placeholder="Örn. Equinox 800" /></Field>
          <Field label="Seri no (biliyorsan)"><Input name="serial" /></Field>
        </div>
      </div>
      <div>
        <b className="text-lg">2. Ne oluyor?</b>
        <Field label="Arızayı kısaca anlat" className="mt-2">
          <Textarea name="issue" required minLength={10} placeholder="Örn. açılıyor ama ses gelmiyor, ekranda hata kodu var…" />
        </Field>
        <p className="mt-2 text-xs text-mute">
          Kısa bir video çekip {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener" className="font-bold text-link">WhatsApp&apos;tan</a> : "WhatsApp'tan"} gönderirsen teknisyen önceden bakar; çoğu sorun cihaz gelmeden çözülür.
        </p>
      </div>
      <ul className="grid gap-1.5 rounded-2xl bg-soft p-3 text-[13px] text-mute sm:grid-cols-3">
        <li><b className="block text-deep">Ücretsiz kargo</b>Kodu SMS ile gelir.</li>
        <li><b className="block text-deep">Durumu buradan izle</b>Her adımda bilgi veririz.</li>
        <li><b className="block text-deep">Garantideyse ücretsiz</b>Değilse önce fiyat sorarız.</li>
      </ul>
      <SubmitButton size="lg" className="self-start">Servis kaydını aç</SubmitButton>
    </ActionForm>
  );
}

export function ServiceTab({ services, devices, ariza, created, whatsapp }: { services: Service[]; devices: Device[]; ariza?: string; created?: string; whatsapp: string | null }) {
  const open = services.filter((x) => x.status !== "CLOSED");
  const past = services.filter((x) => x.status === "CLOSED");
  const busy = new Map(open.filter((x) => x.serial).map((x) => [x.serial!, x]));
  // Neden geldi? Arıza bildirmeye (cihazdan tıkladıysa ya da açık kaydı yoksa) → form öne; açık kaydı varsa → durum öne
  const wantsNew = ariza !== undefined || open.length === 0;
  const preselect = ariza && devices.some((d) => d.s.serial === ariza) ? ariza : null;

  const form = (
    <section id="ariza" className="scroll-mt-24" data-testid="service-new">
      {wantsNew ? (
        <>
          <h2 className="mb-3 font-display text-xl font-extrabold">Arıza bildir</h2>
          <NewForm devices={devices} busy={busy} preselect={preselect} whatsapp={whatsapp} />
        </>
      ) : (
        <Link href="/hesabim?ariza=#ariza" className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-line p-4 text-sm transition hover:border-brand hover:bg-tint" data-testid="service-new-cta">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-deep text-white"><Plus size={19} /></span>
          <span className="flex-1"><b className="block">Başka bir cihazda sorun mu var?</b><span className="text-mute">Yeni servis kaydı aç</span></span>
        </Link>
      )}
    </section>
  );

  const openList = open.length ? (
    <section className="flex flex-col gap-3" data-testid="service-open-list">
      <h2 className="font-display text-xl font-extrabold">{open.length === 1 ? "Serviste olan cihazın" : `Serviste olan ${open.length} cihazın`}</h2>
      {open.map((x) => <OpenCard key={x.id} x={x} fresh={created === String(x.number)} />)}
    </section>
  ) : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {created ? (
        <p className="flex items-center gap-2 rounded-2xl bg-ok-bg p-4 text-sm font-bold text-ok" data-testid="service-created">
          <CheckCircle2 size={18} /> Servis kaydın açıldı ({serviceNo(Number(created))}). Ücretsiz kargo kodunu SMS ile göndereceğiz.
        </p>
      ) : null}
      {wantsNew && !created ? <>{form}{openList}</> : <>{openList}{form}</>}

      {past.length ? (
        <details className="group rounded-3xl border border-line" data-testid="service-history">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-soft"><History size={18} /></span>
            <span className="flex-1"><b className="block">Geçmiş servis kayıtları ({past.length})</b><span className="text-mute">Tamamlanan onarımlar ve sonuçları</span></span>
            <ChevronDown size={18} className="transition group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {past.map((x) => (
              <li key={x.id} className="p-4 text-sm" data-testid="service-past">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <b>{x.productName}</b>
                  <span className="text-xs text-mute">{serviceNo(x.number)} · {formatDate(x.createdAt)} → {closedAt(x) ? formatDate(new Date(closedAt(x)!)) : "—"}</span>
                </div>
                {x.serial ? <span className="font-mono text-xs text-mute">Seri no {x.serial}</span> : null}
                <p className="mt-1.5 text-mute"><b className="text-deep">Arıza:</b> {x.issue}</p>
                {lastNote(x) ? <p className="text-mute"><b className="text-deep">Sonuç:</b> {lastNote(x)}</p> : null}
                <p className="mt-1 text-xs font-bold">{x.underWarranty ? <span className="text-ok">Garanti kapsamında, ücretsiz</span> : x.cost ? `Ücret: ${formatTL(x.cost)}` : null}</p>
                <Timeline x={x} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
