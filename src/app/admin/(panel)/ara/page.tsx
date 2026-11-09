import Link from "next/link";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { customers, orders, products, serialNumbers } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { OrderStatusBadge } from "@/components/admin/status";
import { Card, CardHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatTL, orderNo } from "@/lib/utils";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff();
  const q = ((await searchParams).q ?? "").trim();
  const num = Number(q.replace(/\D/g, ""));
  const like = `%${q}%`;
  const [o, c, p, s] = q
    ? await Promise.all([
        can(staff.permissions, "orders.view")
          ? db.select().from(orders).where(or(num ? eq(orders.number, num) : undefined, ilike(orders.email, like), ilike(orders.phone, like), sql`${orders.shippingAddress}->>'fullName' ilike ${like}`, ilike(orders.trackingNumber, like))).limit(10)
          : [],
        can(staff.permissions, "customers.view") ? db.select().from(customers).where(or(ilike(customers.name, like), ilike(customers.email, like), ilike(customers.phone, like))).limit(10) : [],
        can(staff.permissions, "products.view") ? db.select().from(products).where(or(ilike(products.name, like), ilike(products.sku, like), ilike(products.barcode, like))).limit(10) : [],
        can(staff.permissions, "inventory.manage") || can(staff.permissions, "service.manage") ? db.query.serialNumbers.findMany({ where: ilike(serialNumbers.serial, like), with: { product: true, orderItem: true }, limit: 10 }) : [],
      ])
    : [[], [], [], []];
  const empty = !o.length && !c.length && !p.length && !s.length;
  return (
    <>
      <PageHeader title={q ? `"${q}" için sonuçlar` : "Ara"} />
      {empty ? <p className="text-mute">{q ? "Sonuç bulunamadı." : "Üstteki arama kutusunu kullan."}</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {o.length ? (
          <Card><CardHeader title="Siparişler" /><ul className="divide-y divide-line">{o.map((x) => <li key={x.id}><Link href={`/admin/siparisler/${x.id}`} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-soft"><span><b>{orderNo(x.number)}</b> · {x.shippingAddress.fullName}</span><span className="flex items-center gap-2">{formatTL(x.total)} <OrderStatusBadge status={x.status} /></span></Link></li>)}</ul></Card>
        ) : null}
        {c.length ? (
          <Card><CardHeader title="Müşteriler" /><ul className="divide-y divide-line">{c.map((x) => <li key={x.id}><Link href={`/admin/musteriler/${x.id}`} className="block px-5 py-3 text-sm hover:bg-soft"><b>{x.name}</b> <span className="text-mute">{x.phone} {x.email}</span></Link></li>)}</ul></Card>
        ) : null}
        {p.length ? (
          <Card><CardHeader title="Ürünler" /><ul className="divide-y divide-line">{p.map((x) => <li key={x.id}><Link href={`/admin/urunler/${x.id}`} className="flex justify-between px-5 py-3 text-sm hover:bg-soft"><span><b>{x.name}</b> <span className="text-mute">{x.sku}</span></span><span>{formatTL(x.price)} · {x.stock} stok</span></Link></li>)}</ul></Card>
        ) : null}
        {s.length ? (
          <Card><CardHeader title="Seri numaraları" /><ul className="divide-y divide-line">{s.map((x) => <li key={x.id} className="px-5 py-3 text-sm"><b className="font-mono">{x.serial}</b> · {x.product.name} · {x.status}{x.orderItem ? <> · <Link className="text-link" href={`/admin/siparisler/${x.orderItem.orderId}`}>siparişe git</Link></> : null}</li>)}</ul></Card>
        ) : null}
      </div>
    </>
  );
}
