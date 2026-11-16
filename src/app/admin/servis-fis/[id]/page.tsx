import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { serviceRecords } from "@/db/schema";
import { Logo } from "@/components/logo";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, serviceNo } from "@/lib/utils";
import { PrintButton } from "../../yazdir/print-button";

export const metadata = { title: "Servis kabul fişi" };

/** Müşteri cihazı bırakırken verilen kabul fişi: iki nüsha (müşteri + mağaza), imza alanlarıyla. */
export default async function ServiceReceipt({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("service.manage");
  const { id } = await params;
  const r = await db.query.serviceRecords.findFirst({ where: eq(serviceRecords.id, id) });
  if (!r) notFound();
  const s = await getSettings();
  const site = process.env.APP_URL || "";
  const copy = (who: string) => (
    <section className="sheet mx-auto max-w-[760px] p-8" data-testid="receipt">
      <header className="flex items-start justify-between border-b border-black pb-3">
        <div>
          <Logo size={24} />
          <p className="mt-1 text-[11px]">{s.store.legalName || s.store.name}</p>
          <p className="text-[11px]">{s.store.address} · {s.store.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase">Servis kabul fişi · {who}</p>
          <p className="text-2xl font-extrabold">{serviceNo(r.number)}</p>
          <p>{formatDate(r.createdAt, true)}</p>
        </div>
      </header>
      <table className="mt-4 w-full text-[13px]">
        <tbody>
          {[
            ["Müşteri", `${r.contactName} · ${r.contact}`],
            ["Cihaz", r.productName],
            ["Seri no", r.serial ?? "—"],
            ["Garanti", r.underWarranty ? "Garanti kapsamında (ücretsiz onarım)" : "Garanti dışı (ücret onayınla yapılır)"],
            ["Bildirilen arıza", r.issue],
            ["Teslim alınanlar / durum", r.accessories ?? "—"],
          ].map(([k, v]) => (
            <tr key={k} className="border-b border-[#ddd] align-top">
              <td className="w-48 py-2 font-bold">{k}</td>
              <td className="py-2 whitespace-pre-wrap">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-[11.5px] leading-relaxed">
        Cihazınızın durumunu {site ? <b>{site.replace(/^https?:\/\//, "")}/servis</b> : "sitemizdeki Servis sayfasından"} adresinde servis numaranızla takip edebilirsiniz.
        Garanti dışı onarımlarda ücret size bildirilmeden işlem yapılmaz. Yasal azami tamir süresi 20 iş günüdür. Cihazı teslim alırken bu fişi getiriniz.
      </p>
      <div className="mt-10 grid grid-cols-2 gap-10 text-center text-[12px]">
        <div className="border-t border-black pt-2">Teslim eden (müşteri) ad soyad / imza</div>
        <div className="border-t border-black pt-2">Teslim alan (mağaza) ad soyad / imza</div>
      </div>
    </section>
  );
  return (
    <div className="bg-white text-[13px] text-black">
      <style>{`@media print{.no-print{display:none}.sheet{page-break-after:always}} @page{size:A4;margin:12mm}`}</style>
      <div className="no-print flex items-center justify-between border-b p-4">
        <span className="font-bold">{serviceNo(r.number)} · iki nüsha</span>
        <PrintButton />
      </div>
      {copy("Müşteri nüshası")}
      {copy("Mağaza nüshası")}
    </div>
  );
}
