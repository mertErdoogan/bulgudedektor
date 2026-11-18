import { getL } from "@/lib/i18n/server";
import { allowIp } from "@/lib/guard";
import { pageMeta } from "@/lib/seo";
import { eq } from "drizzle-orm";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { db } from "@/db";
import { serialNumbers } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({ title: L("Dedektör Seri No Sorgulama — Cihazım Orijinal mi?", "Metal Detector Serial Number Check — Is Mine Genuine?"), description: L("Dedektörünüzün seri numarasını girin; orijinal, faturalı ve garantili olup olmadığını anında öğrenin.", "Enter your detector's serial number to see instantly whether it is genuine, invoiced and under warranty."), path: "/seri-no" });
}

export default async function SerialPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const no = ((await searchParams).no ?? "").trim().toUpperCase();
  const L = await getL();
  const limited = !!no && !(await allowIp("serial", 30, 15 * 60 * 1000));
  const s = no && !limited ? await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.serial, no), with: { product: { with: { brand: true } } } }) : null;
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="font-display text-2xl font-extrabold">{L("Cihazın orijinal mi?", "Is your detector genuine?")}</h1>
      <p className="mt-1 text-sm text-mute">{L("Seri numarası cihazın şasesinde veya kutunun üzerindeki etikette yazar. Sorgu, distribütör kayıtlarımızla karşılaştırılır.", "The serial number is on the detector's shaft or on the label on the box. We check it against our distributor records.")}</p>
      <form className="mt-5 flex gap-2">
        <input name="no" defaultValue={no} required placeholder={L("Seri no", "Serial number")} className="h-12 flex-1 rounded-lg border border-[#d6d6d9] px-4 font-mono uppercase" />
        <button className="h-12 rounded-lg bg-brand px-5 font-extrabold text-white">{L("Sorgula", "Check")}</button>
      </form>
      {limited ? <p className="mt-6 font-semibold text-danger">{L("Çok fazla sorgu yapıldı. 15 dakika sonra tekrar dene.", "Too many checks. Please try again in 15 minutes.")}</p> : null}
      {no && !limited ? (
        s ? (
          <div className="mt-6 flex gap-3 rounded-2xl bg-tint p-5">
            <CheckCircle2 className="shrink-0 text-brand" size={28} />
            <div className="text-sm">
              <b className="text-base">{L("Kayıtlı, orijinal ürün", "Registered, genuine product")}</b>
              <p>{s.product.brand?.name} {s.product.name} · <span className="font-mono">{s.serial}</span></p>
              {s.soldAt ? <p className="mt-1">{L("Satış", "Sold")}: {formatDate(s.soldAt, false, L.locale)} · {L("Garanti bitişi", "Warranty until")}: <b>{formatDate(s.warrantyUntil, false, L.locale)}</b> {s.warrantyUntil && s.warrantyUntil > new Date() ? L("(garanti devam ediyor)", "(under warranty)") : L("(garanti süresi dolmuş)", "(warranty expired)")}</p> : <p className="mt-1">{L("Henüz satılmamış, stoğumuzda kayıtlı.", "Not sold yet; registered in our stock.")}</p>}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex gap-3 rounded-2xl bg-danger-bg p-5 text-danger">
            <CircleAlert className="shrink-0" size={28} />
            <div className="text-sm"><b className="text-base">{L("Kayıt bulunamadı", "No record found")}</b><p>{L("Seri numarasını kontrol et. Cihazı bizden almadıysan veya emin değilsen fotoğrafını WhatsApp'tan gönder, birlikte bakalım.", "Check the serial number. If you didn't buy the detector from us or aren't sure, send us a photo on WhatsApp and we'll take a look together.")}</p></div>
          </div>
        )
      ) : null}
    </div>
  );
}
