import Link from "next/link";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { AlertTriangle, ArrowRight, MessageCircle, Package, ShoppingBag, Star, Undo2, Wrench } from "lucide-react";
import { db } from "@/db";
import { conversations, orders, productQuestions, products, returnRequests, reviews, serviceRecords } from "@/db/schema";
import { SalesChart } from "@/components/admin/charts";
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
  const [sToday, s30, sPrev, series, top, recent, toPrepare, toShip, lowStock, openConv, returns, service, pendingRev, pendingQ] = await Promise.all([
    salesSummary(today, now),
    salesSummary(d30, now),
    salesSummary(d60, d30),
    dailySeries(d30, now),
    topProducts(d30, now, 5),
    db.query.orders.findMany({ orderBy: desc(orders.createdAt), limit: 8 }),
    db.select({ n }).from(orders).where(eq(orders.status, "PAID")),
    db.select({ n }).from(orders).where(eq(orders.status, "PREPARING")),
    db.query.products.findMany({ where: and(eq(products.status, "ACTIVE"), lte(products.stock, products.lowStockThreshold)), orderBy: products.stock, limit: 6 }),
    db.select({ n }).from(conversations).where(eq(conversations.status, "OPEN")),
    db.select({ n }).from(returnRequests).where(eq(returnRequests.status, "REQUESTED")),
    db.select({ n }).from(serviceRecords).where(inArray(serviceRecords.status, ["RECEIVED", "AWAITING_DEVICE", "IN_REPAIR", "WAITING_PART", "READY"])),
    db.select({ n }).from(reviews).where(eq(reviews.isApproved, false)),
    db.select({ n }).from(productQuestions).where(sql`${productQuestions.answer} is null`),
  ]);

  const change = sPrev.revenue ? ((s30.revenue - sPrev.revenue) / sPrev.revenue) * 100 : 0;
  const tasks = [
    { show: can(staff.permissions, "orders.manage"), n: toPrepare[0].n, label: "Hazırlanacak sipariş", href: "/admin/siparisler?durum=PAID", icon: ShoppingBag },
    { show: can(staff.permissions, "orders.manage"), n: toShip[0].n, label: "Kargoya verilecek", href: "/admin/siparisler?durum=PREPARING", icon: Package },
    { show: can(staff.permissions, "inbox.manage"), n: openConv[0].n, label: "Yanıt bekleyen mesaj", href: "/admin/mesajlar", icon: MessageCircle },
    { show: can(staff.permissions, "orders.view"), n: returns[0].n, label: "İade talebi", href: "/admin/iadeler", icon: Undo2 },
    { show: can(staff.permissions, "service.manage"), n: service[0].n, label: "Açık servis kaydı", href: "/admin/servis", icon: Wrench },
    { show: can(staff.permissions, "reviews.manage"), n: pendingRev[0].n + pendingQ[0].n, label: "Onay bekleyen yorum / soru", href: "/admin/yorumlar", icon: Star },
  ].filter((t) => t.show);

  return (
    <>
      {yetki === "yok" ? (
        <div className="mb-4 rounded-lg border border-warn/30 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">Bu sayfaya erişim yetkin yok. Gerekirse yöneticinden iste.</div>
      ) : null}
      <PageHeader title={`Merhaba ${staff.name.split(" ")[0]}`} description={`${tasks.reduce((a, t) => a + t.n, 0)} iş seni bekliyor · ${formatDate(now)}`} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tasks.map((t) => (
          <Link key={t.label} href={t.href} className="group flex items-center gap-3 rounded-xl border border-line bg-white p-4 hover:border-brand">
            <span className={`grid h-11 w-11 place-items-center rounded-lg ${t.n ? "bg-pop text-on-pop" : "bg-soft text-mute"}`}>
              <t.icon size={20} />
            </span>
            <span className="flex-1">
              <span className="font-display block text-2xl leading-none font-extrabold">{t.n}</span>
              <span className="text-sm text-mute">{t.label}</span>
            </span>
            <ArrowRight size={18} className="text-mute group-hover:text-brand" />
          </Link>
        ))}
      </div>

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

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
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

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
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
