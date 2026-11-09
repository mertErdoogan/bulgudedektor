import { eq } from "drizzle-orm";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { db } from "@/db";
import { serialNumbers } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Seri no sorgulama — cihazın orijinal mi?" };

export default async function SerialPage({ searchParams }: { searchParams: Promise<{ no?: string }> }) {
  const no = ((await searchParams).no ?? "").trim().toUpperCase();
  const s = no ? await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.serial, no), with: { product: { with: { brand: true } } } }) : null;
  return (
    <div className="container-x max-w-xl py-12">
      <h1 className="font-display text-2xl font-extrabold">Cihazın orijinal mi?</h1>
      <p className="mt-1 text-sm text-mute">Seri numarası cihazın şasesinde veya kutunun üzerindeki etikette yazar. Sorgu, distribütör kayıtlarımızla karşılaştırılır.</p>
      <form className="mt-5 flex gap-2">
        <input name="no" defaultValue={no} required placeholder="Seri no" className="h-12 flex-1 rounded-lg border border-[#cfd6cc] px-4 font-mono uppercase" />
        <button className="h-12 rounded-lg bg-brand px-5 font-extrabold text-white">Sorgula</button>
      </form>
      {no ? (
        s ? (
          <div className="mt-6 flex gap-3 rounded-2xl bg-tint p-5">
            <CheckCircle2 className="shrink-0 text-brand" size={28} />
            <div className="text-sm">
              <b className="text-base">Kayıtlı, orijinal ürün</b>
              <p>{s.product.brand?.name} {s.product.name} · <span className="font-mono">{s.serial}</span></p>
              {s.soldAt ? <p className="mt-1">Satış: {formatDate(s.soldAt)} · Garanti bitişi: <b>{formatDate(s.warrantyUntil)}</b> {s.warrantyUntil && s.warrantyUntil > new Date() ? "(garanti devam ediyor)" : "(garanti süresi dolmuş)"}</p> : <p className="mt-1">Henüz satılmamış, stoğumuzda kayıtlı.</p>}
            </div>
          </div>
        ) : (
          <div className="mt-6 flex gap-3 rounded-2xl bg-danger-bg p-5 text-danger">
            <CircleAlert className="shrink-0" size={28} />
            <div className="text-sm"><b className="text-base">Kayıt bulunamadı</b><p>Seri numarasını kontrol et. Cihazı bizden almadıysan veya emin değilsen fotoğrafını WhatsApp&apos;tan gönder, birlikte bakalım.</p></div>
          </div>
        )
      ) : null}
    </div>
  );
}
