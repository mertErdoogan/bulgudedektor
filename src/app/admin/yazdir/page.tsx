import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { Logo } from "@/components/logo";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTL, orderNo } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Paket fişi" };

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  await requireStaff("orders.view");
  const ids = ((await searchParams).ids ?? "").split(",").filter(Boolean).slice(0, 100);
  const s = await getSettings();
  const rows = ids.length ? await db.query.orders.findMany({ where: inArray(orders.id, ids), with: { items: { with: { serials: true } } } }) : [];
  return (
    <div className="bg-white text-[13px] text-black">
      <style>{`@media print{.no-print{display:none}.sheet{page-break-after:always}} @page{size:A4;margin:14mm}`}</style>
      <div className="no-print flex items-center justify-between border-b p-4">
        <span className="font-bold">{rows.length} sipariş</span>
        <PrintButton />
      </div>
      {rows.map((o) => (
        <section key={o.id} className="sheet mx-auto max-w-[760px] p-8">
          <header className="flex items-start justify-between">
            <Logo size={26} />
            <div className="text-right">
              <p className="text-lg font-extrabold">{orderNo(o.number)}</p>
              <p>{formatDate(o.createdAt, true)}</p>
            </div>
          </header>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="mb-1 font-bold uppercase">Alıcı</p>
              <p>
                {o.shippingAddress.fullName}
                <br />
                {o.shippingAddress.line}
                <br />
                {o.shippingAddress.district} / {o.shippingAddress.city}
                <br />
                {o.shippingAddress.phone}
              </p>
            </div>
            <div>
              <p className="mb-1 font-bold uppercase">Gönderen</p>
              <p>
                {s.store.legalName}
                <br />
                {s.store.address}
                <br />
                {s.store.phone}
              </p>
            </div>
          </div>
          <table className="mt-6 w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-2">Ürün</th>
                <th>SKU</th>
                <th>Seri no</th>
                <th className="text-right">Adet</th>
                <th className="text-right">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="py-2">{i.name}</td>
                  <td>{i.sku}</td>
                  <td className="font-mono">{i.serials.map((x) => x.serial).join(", ") || "—"}</td>
                  <td className="text-right">{i.quantity}</td>
                  <td className="text-right">{formatTL(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-right text-base font-extrabold">Toplam: {formatTL(o.total)}</p>
          <p className="mt-2 text-right">{o.paymentMethod === "CARD" ? `Kart · ${o.installments > 1 ? o.installments + " taksit" : "tek çekim"}` : "Havale / EFT"}</p>
          <div className="mt-8 rounded border p-3">
            <p className="font-bold">Kutu kontrol</p>
            <p>☐ Cihaz ve aksesuarlar ☐ Fatura ☐ Garanti belgesi ☐ Kurulum QR kartı</p>
          </div>
          <p className="mt-6 text-xs">Bu belge paket fişidir, fatura yerine geçmez. Fatura e-arşiv olarak gönderilir.</p>
        </section>
      ))}
    </div>
  );
}
