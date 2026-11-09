import { MessageCircle, Phone, Store } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "./form";

export const metadata = { title: "İletişim" };

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ konu?: string; urun?: string }> }) {
  const s = await getSettings();
  const sp = await searchParams;
  const subject = sp.konu === "goruntulu" ? `Görüntülü görüşme talebi${sp.urun ? `: ${sp.urun}` : ""}` : sp.konu === "kiralama" ? `Deneme kiralaması${sp.urun ? `: ${sp.urun}` : ""}` : sp.konu === "sifre" ? "Şifre sıfırlama" : "";
  return (
    <div className="container-x grid max-w-5xl gap-8 py-10 md:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-extrabold">Bize ulaş</h1>
        <p className="text-mute">{s.store.workingHours}. Cihaz seçimi, sipariş, servis — hepsi aynı hatta.</p>
        {s.store.whatsapp ? <a href={`https://wa.me/${s.store.whatsapp}`} target="_blank" className="flex items-center gap-3 rounded-xl bg-[#e9f9ef] p-4 font-bold text-[#11643a]"><MessageCircle /> WhatsApp: +{s.store.whatsapp}</a> : null}
        {s.store.phone ? <a href={`tel:${s.store.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl bg-soft p-4 font-bold"><Phone /> {s.store.phone}</a> : null}
        {s.store.address ? <p className="flex items-start gap-3 rounded-xl bg-soft p-4 text-sm"><Store className="shrink-0" /> <span><b>Showroom</b><br />{s.store.address}</span></p> : null}
      </div>
      <ContactForm subject={subject} />
    </div>
  );
}
