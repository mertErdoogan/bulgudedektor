import { getL } from "@/lib/i18n/server";
import { pageMeta } from "@/lib/seo";
import { MessageCircle, Phone, Store } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { ContactForm } from "./form";
import { JsonLd } from "@/components/seo/json-ld";
import { graph, storeLd } from "@/lib/seo";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({ title: L("İletişim — Uzmana Sor, Showroom ve WhatsApp", "Contact — Ask an Expert, Showroom and WhatsApp"), description: L("Dedektör uzmanımıza WhatsApp, telefon veya görüntülü görüşmeyle ulaşın. Showroom adresi ve çalışma saatleri.", "Reach our metal detector expert by WhatsApp, phone or video call. Showroom address and opening hours."), path: "/iletisim" });
}

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ konu?: string; urun?: string }> }) {
  const s = await getSettings();
  const sp = await searchParams;
  const L = await getL();
  const subject = sp.konu === "goruntulu" ? `${L("Görüntülü görüşme talebi", "Video call request")}${sp.urun ? `: ${sp.urun}` : ""}` : sp.konu === "sifre" ? L("Şifre sıfırlama", "Password reset") : "";
  return (
    <div className="container-x grid max-w-5xl gap-8 py-10 md:grid-cols-[1fr_1.2fr]">
      <JsonLd data={graph(storeLd(s))} />
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl font-extrabold">{L("Bize ulaş", "Get in touch")}</h1>
        <p className="text-mute">{s.store.workingHours}. {L("Cihaz seçimi, sipariş, servis — hepsi aynı hatta.", "Choosing a detector, orders, service — all on the same line.")}</p>
        {s.store.whatsapp ? <a href={`https://wa.me/${s.store.whatsapp}`} target="_blank" className="flex items-center gap-3 rounded-xl bg-[#e9f9ef] p-4 font-bold text-[#11643a]"><MessageCircle /> WhatsApp: +{s.store.whatsapp}</a> : null}
        {s.store.phone ? <a href={`tel:${s.store.phone.replace(/\s/g, "")}`} className="flex items-center gap-3 rounded-xl bg-soft p-4 font-bold"><Phone /> {s.store.phone}</a> : null}
        {s.store.address ? <p className="flex items-start gap-3 rounded-xl bg-soft p-4 text-sm"><Store className="shrink-0" /> <span><b>Showroom</b><br />{s.store.address}</span></p> : null}
      </div>
      <ContactForm subject={subject} />
    </div>
  );
}
