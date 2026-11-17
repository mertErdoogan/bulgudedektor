import { MapPin, MessageCircle, Navigation, Phone, Store } from "lucide-react";
import { openState } from "@/lib/opening-hours";
import type { StoreSettings } from "@/lib/settings";

const DAY = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

/**
 * Ürün sayfasında "Showroom'da gör": form veya randevu yok; müşteri doğrudan mağaza çalışanına ulaşır.
 * WhatsApp mesajı ürün adıyla hazır gelir, personel hangi cihazın sorulduğunu hemen görür.
 * Tıklamalar Attribution'da "contact" olayı (context=showroom) olarak ölçülür.
 */
export function ShowroomCard({ productName, onDisplay, st }: { productName: string; onDisplay: boolean; st: StoreSettings }) {
  if (!st.whatsapp && !st.phone && !st.address) return null;
  const where = st.latitude && st.longitude ? `${st.latitude},${st.longitude}` : st.address;
  const os = openState(st.openingHours);
  const msg = onDisplay
    ? `Merhaba, ${productName} cihazını showroom'da görmek istiyorum. Ne zaman gelebilirim?`
    : `Merhaba, ${productName} cihazını showroom'da görebilir miyim? Ne zaman gelebilirim?`;
  const wa = st.whatsapp ? `https://wa.me/${st.whatsapp}?text=${encodeURIComponent(msg)}` : null;
  const tel = st.phone ? `tel:${st.phone.replace(/[^\d+]/g, "")}` : null;
  const place = [st.district, st.city].filter(Boolean).join(", ");
  const todayIdx = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].indexOf(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", weekday: "short" }).format(new Date()).slice(0, 2));
  const dayWord = (d: number | null | undefined) => (d == null ? "bugün" : d === (todayIdx + 1) % 7 ? "yarın" : DAY[d]);
  const status = !os
    ? null
    : os.open
      ? { on: true, text: `Şu an açık · ${os.until}'e kadar` }
      : { on: false, text: os.next ? `Kapalı · ${dayWord(os.nextDay)} ${os.next}'da açılır` : "Kapalı" };

  return (
    <section className="rounded-2xl border border-line bg-white p-4" data-testid="showroom-card" aria-label="Showroom">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft text-deep"><Store size={19} /></span>
        <div className="min-w-0 flex-1">
          <b className="block text-[15px]">{onDisplay ? "Showroom'da deneyebilirsin" : "Showroom'da görmek ister misin?"}</b>
          <span className="block text-[13px] text-mute">
            {onDisplay ? "Bu cihaz sergide; elinde tart, ayarlarını uzmanımızla birlikte dene." : "Sergide değilse bile sor; uygun bir saatte hazırlayalım."}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
            {place ? <span className="inline-flex items-center gap-1 text-mute"><MapPin size={13} /> {place}</span> : null}
            {status ? (
              <span className={`inline-flex items-center gap-1.5 font-bold ${status.on ? "text-ok" : "text-mute"}`} data-testid="showroom-open">
                <span className={`h-2 w-2 rounded-full ${status.on ? "bg-ok" : "bg-line"}`} /> {status.text}
              </span>
            ) : null}
          </span>
        </div>
        {onDisplay ? <span className="shrink-0 rounded-full bg-ok-bg px-2.5 py-1 text-[11.5px] font-extrabold text-ok" data-testid="on-display">Sergide</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener" data-contact="showroom" className="flex items-center justify-center gap-1.5 rounded-xl bg-[#15803d] px-2 py-2.5 text-[13px] font-extrabold text-white hover:bg-[#11643a]" data-testid="showroom-wa">
            <MessageCircle size={16} /> WhatsApp
          </a>
        ) : null}
        {tel ? (
          <a href={tel} data-contact="showroom" className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2.5 text-[13px] font-extrabold hover:bg-soft" data-testid="showroom-call">
            <Phone size={15} /> Ara
          </a>
        ) : null}
        {where ? (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(where)}`} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-2 py-2.5 text-[13px] font-extrabold hover:bg-soft" data-testid="showroom-map">
            <Navigation size={15} /> Yol tarifi
          </a>
        ) : null}
      </div>
    </section>
  );
}
