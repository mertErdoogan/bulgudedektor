import { asc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { Logo } from "@/components/logo";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatDate, formatTL, orderNo } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = { title: "Paket fişi" };

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ids?: string; tur?: string }> }) {
  await requireStaff("orders.view");
  const sp = await searchParams;
  const ids = (sp.ids ?? "").split(",").filter(Boolean).slice(0, 100);
  const s = await getSettings();
  const rows = ids.length ? await db.query.orders.findMany({ where: inArray(orders.id, ids), with: { items: { with: { serials: true, product: { columns: { sku: true, barcode: true } } } } }, orderBy: asc(orders.number) }) : [];
  if (sp.tur === "toplama") return <PickList rows={rows} />;
  if (sp.tur === "etiket") return <Labels rows={rows} sender={{ name: s.store.legalName || s.store.name, address: s.store.address, phone: s.store.phone }} />;
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

type Rows = Awaited<ReturnType<typeof loadType>>;
// Yalnızca tip çıkarımı için (çağrılmaz)
async function loadType() {
  return db.query.orders.findMany({ with: { items: { with: { serials: true, product: { columns: { sku: true, barcode: true } } } } } });
}

/** Depo toplama listesi: seçili siparişlerdeki ürünler SKU'ya göre birleştirilir; her ürün bir kez raftan alınır. */
function PickList({ rows }: { rows: Rows }) {
  const map = new Map<string, { name: string; sku: string; barcode: string | null; qty: number; orders: number[] }>();
  for (const o of rows)
    for (const i of o.items) {
      const k = i.sku;
      const cur = map.get(k) ?? { name: i.name, sku: i.sku, barcode: i.product?.barcode ?? null, qty: 0, orders: [] };
      cur.qty += i.quantity;
      cur.orders.push(o.number);
      map.set(k, cur);
    }
  const list = [...map.values()].sort((a, b) => a.sku.localeCompare(b.sku, "tr"));
  return (
    <div className="bg-white text-[13px] text-black">
      <style>{`@media print{.no-print{display:none}} @page{size:A4;margin:12mm}`}</style>
      <div className="no-print flex items-center justify-between border-b p-4">
        <span className="font-bold">
          Toplama listesi · {rows.length} sipariş · {list.reduce((a, x) => a + x.qty, 0)} ürün
        </span>
        <PrintButton />
      </div>
      <section className="mx-auto max-w-[760px] p-6">
        <h1 className="text-xl font-extrabold">Toplama listesi</h1>
        <p className="mb-4">
          {formatDate(new Date(), true)} · Siparişler: {rows.map((o) => orderNo(o.number)).join(", ")}
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="w-8 py-2">✓</th>
              <th>Ürün</th>
              <th>SKU / barkod</th>
              <th className="text-right">Adet</th>
              <th className="text-right">Siparişler</th>
            </tr>
          </thead>
          <tbody>
            {list.map((x) => (
              <tr key={x.sku} className="border-b align-top">
                <td className="py-2.5">
                  <span className="inline-block h-4 w-4 border border-black" />
                </td>
                <td className="py-2.5 font-semibold">{x.name}</td>
                <td className="font-mono">
                  {x.sku}
                  {x.barcode ? <span className="block text-[11px]">{x.barcode}</span> : null}
                </td>
                <td className="text-right text-lg font-extrabold">{x.qty}</td>
                <td className="text-right text-[11px]">{x.orders.map((n) => orderNo(n)).join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-[11px]">Seri takipli cihazların seri numaralarını paketlemeden önce sipariş sayfasından atayın.</p>
      </section>
    </div>
  );
}

/** Kargo adres etiketi: A4'e 2×4 (8 etiket, 105×74 mm civarı). Etiket yazıcısı varsa tek sütun basılır. */
function Labels({ rows, sender }: { rows: Rows; sender: { name: string; address: string; phone: string } }) {
  return (
    <div className="bg-white text-black">
      <style>{`@media print{.no-print{display:none}} @page{size:A4;margin:6mm} .lbl{break-inside:avoid}`}</style>
      <div className="no-print flex items-center justify-between border-b p-4">
        <span className="font-bold">{rows.length} adres etiketi</span>
        <PrintButton />
      </div>
      <div className="grid grid-cols-2 gap-[4mm] p-[2mm]">
        {rows.map((o) => (
          <div key={o.id} className="lbl flex h-[70mm] flex-col justify-between rounded border-2 border-dashed border-black p-4 text-[13px]">
            <div>
              <p className="text-[10px] uppercase">Alıcı</p>
              <p className="text-[17px] leading-tight font-extrabold">{o.shippingAddress.fullName}</p>
              <p className="mt-1 leading-snug">{o.shippingAddress.line}</p>
              <p className="font-bold">
                {o.shippingAddress.district} / {o.shippingAddress.city}
              </p>
              <p>{o.shippingAddress.phone}</p>
            </div>
            <div className="flex items-end justify-between border-t border-black pt-2 text-[10px]">
              <span>
                Gönderen: <b>{sender.name}</b>
                <br />
                {sender.address} · {sender.phone}
              </span>
              <span className="text-right text-[15px] font-extrabold">
                {orderNo(o.number)}
                <span className="block text-[10px] font-normal">{o.deliveryMethod === "PICKUP" ? "MAĞAZADAN TESLİM" : (o.carrier ?? "")}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
