import Link from "next/link";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { SalesChart } from "@/components/admin/charts";
import { WorkList } from "@/components/admin/worklist";
import { getWorklist, WORK_GROUPS } from "@/lib/worklist";
import { PageHeader } from "@/components/admin/shell";
import { OrderStatusBadge } from "@/components/admin/status";
import { Badge, Card, CardHeader, Stat, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { expireStalePendingOrders } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { dailySeries, salesSummary, topProducts } from "@/lib/reports";
import { formatDate, formatTL, orderNo } from "@/lib/utils";

export const metadata = { title: "Pano" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ yetki?: string }> }) {
  const staff = await requireStaff("dashboard.view");
  const { yetki } = await searchParams;
  await expireStalePendingOrders();
  const finance = can(staff.permissions, "reports.finance");

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d30 = new Date(today.getTime() - 29 * 86400000);
  const d60 = new Date(today.getTime() - 59 * 86400000);

  const n = sql<number>`count(*)::int`;
  const [sToday, s30, sPrev, series, top, recent, lowStock] = await Promise.all([
    salesSummary(today, now),
    salesSummary(d30, now),
    salesSummary(d60, d30),
    dailySeries(d30, now),
    topProducts(d30, now, 5),
    db.query.orders.findMany({ orderBy: desc(orders.createdAt), limit: 8 }),
    db.query.products.findMany({ where: and(eq(products.status, "ACTIVE"), lte(products.stock, products.lowStockThreshold)), orderBy: products.stock, limit: 6 }),
  ]);

  const change = sPrev.revenue ? ((s30.revenue - sPrev.revenue) / sPrev.revenue) * 100 : 0;
  const [work, team] = await Promise.all([getWorklist(staff.permissions), db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true))]);
  const late = work.filter((w) => w.late).length;

  return (
    <>
      {yetki === "yok" ? (
        <div className="mb-4 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">Bu sayfaya erişim yetkin yok. Gerekirse yöneticinden iste.</div>
      ) : null}
      <PageHeader title={`Merhaba ${staff.name.split(" ")[0]}`} description={`${work.length} iş bekliyor${late ? `, ${late} tanesi gecikmiş` : ""} · ${formatDate(now)}`} />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-extrabold">Bugün yapılacaklar</h2>
          <Link href="/admin/isler" className="text-sm font-bold text-link">
            Tüm iş listesi →
          </Link>
        </div>
        <WorkList items={work.map((w) => ({ ...w, at: w.at.toISOString() }))} groups={WORK_GROUPS} me={staff.id} staff={team} compact />
      </Card>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {finance ? (
          <>
            <Stat label="Bugün ciro" value={formatTL(sToday.revenue)} sub={`${sToday.orders} sipariş`} />
            <Stat
              label="Son 30 gün ciro"
              value={formatTL(s30.revenue)}
              sub={`${change >= 0 ? "▲" : "▼"} %${Math.abs(change).toFixed(1)} önceki 30 güne göre`}
              tone={change >= 0 ? "ok" : "danger"}
            />
            <Stat label="Ortalama sepet" value={formatTL(s30.aov)} sub={`${s30.orders} sipariş · ${s30.units} ürün`} />
            <Stat label="Brüt kâr (30 gün)" value={formatTL(s30.grossProfit)} sub={s30.revenue ? `Marj %${((s30.grossProfit / s30.revenue) * 100).toFixed(1)}` : "—"} />
          </>
        ) : (
          <>
            <Stat label="Bugün sipariş" value={sToday.orders} />
            <Stat label="Son 30 gün sipariş" value={s30.orders} />
            <Stat label="Satılan ürün (30 gün)" value={s30.units} />
            <Stat label="İptal / iade (30 gün)" value={s30.cancelled} />
          </>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3 [&>*]:min-w-0">
        <Card className="xl:col-span-2">
          <CardHeader title={finance ? "Son 30 gün satış" : "Son 30 gün sipariş"} action={finance ? <Link href="/admin/raporlar" className="text-sm font-bold text-link">Raporlar →</Link> : null} />
          <div className="p-4">
            <SalesChart data={series} money={finance} />
          </div>
        </Card>
        <Card>
          <CardHeader title="En çok satanlar" description="Son 30 gün" />
          <ul className="divide-y divide-line">
            {top.map((p, i) => (
              <li key={p.name} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="w-5 font-bold text-mute">{i + 1}</span>
                <span className="flex-1 font-semibold">{p.name}</span>
                <span className="text-right">
                  <span className="block font-bold">{p.units} adet</span>
                  {finance ? <span className="text-xs text-mute">{formatTL(p.revenue)}</span> : null}
                </span>
              </li>
            ))}
            {!top.length ? <li className="px-5 py-8 text-center text-sm text-mute">Henüz satış yok.</li> : null}
          </ul>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3 [&>*]:min-w-0">
        {can(staff.permissions, "orders.view") ? (
          <Card className="xl:col-span-2">
            <CardHeader title="Son siparişler" action={<Link href="/admin/siparisler" className="text-sm font-bold text-link">Tümü →</Link>} />
            <Table>
              <thead>
                <tr>
                  <Th>Sipariş</Th>
                  <Th>Müşteri</Th>
                  <Th>Tarih</Th>
                  <Th>Durum</Th>
                  <Th className="text-right">Tutar</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id} className="hover:bg-soft/60">
                    <Td>
                      <Link href={`/admin/siparisler/${o.id}`} className="font-bold text-link">
                        {orderNo(o.number)}
                      </Link>
                    </Td>
                    <Td>{o.shippingAddress.fullName}</Td>
                    <Td className="text-mute">{formatDate(o.createdAt, true)}</Td>
                    <Td>
                      <OrderStatusBadge status={o.status} />
                    </Td>
                    <Td className="text-right font-bold">{formatTL(o.total)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ) : null}
        {can(staff.permissions, "products.view") ? (
          <Card>
            <CardHeader title="Stok uyarısı" description="Eşiğin altına düşen ürünler" action={<AlertTriangle size={18} className="text-warn" />} />
            <ul className="divide-y divide-line">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <Link href={`/admin/urunler/${p.id}`} className="font-semibold hover:text-link">
                    {p.name}
                  </Link>
                  <Badge tone={p.stock <= 0 ? "danger" : "warn"}>{p.stock <= 0 ? "Tükendi" : `${p.stock} adet`}</Badge>
                </li>
              ))}
              {!lowStock.length ? <li className="px-5 py-8 text-center text-sm text-mute">Tüm ürünler yeterli stokta.</li> : null}
            </ul>
          </Card>
        ) : null}
      </div>
    </>
  );
}
