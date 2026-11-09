import Link from "next/link";
import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { Download, Plus } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/shell";
import { Button, Card, Input, Select } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { expireStalePendingOrders } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { ORDER_STATUS_LABEL } from "@/lib/utils";
import { OrderTable } from "./order-table";

export const metadata = { title: "Siparişler" };
const PER = 30;
const TABS = ["", "PAID", "PREPARING", "SHIPPED", "PENDING_PAYMENT", "DELIVERED", "CANCELLED", "REFUNDED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("orders.view");
  await expireStalePendingOrders();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.s) || 1);
  const conds: SQL[] = [];
  if (sp.durum) conds.push(eq(orders.status, sp.durum as "PAID"));
  if (sp.odeme) conds.push(eq(orders.paymentMethod, sp.odeme as "CARD"));
  if (sp.teslim) conds.push(eq(orders.deliveryMethod, sp.teslim as "CARGO"));
  if (sp.bas) conds.push(gte(orders.createdAt, new Date(`${sp.bas}T00:00:00`)));
  if (sp.bit) conds.push(lte(orders.createdAt, new Date(`${sp.bit}T23:59:59`)));
  if (sp.q) {
    const num = Number(sp.q.replace(/\D/g, ""));
    conds.push(
      or(
        ilike(orders.email, `%${sp.q}%`),
        ilike(orders.phone, `%${sp.q.replace(/\s/g, "")}%`),
        sql`${orders.shippingAddress}->>'fullName' ilike ${"%" + sp.q + "%"}`,
        ilike(orders.trackingNumber, `%${sp.q}%`),
        num ? eq(orders.number, num) : undefined,
      )!,
    );
  }
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ total }], counts] = await Promise.all([
    db.query.orders.findMany({ where, orderBy: desc(orders.createdAt), limit: PER, offset: (page - 1) * PER, with: { items: { columns: { name: true, quantity: true } } } }),
    db.select({ total: sql<number>`count(*)::int` }).from(orders).where(where),
    db.select({ status: orders.status, n: sql<number>`count(*)::int` }).from(orders).groupBy(orders.status),
  ]);
  const cnt = (s: string) => (s ? counts.find((c) => c.status === s)?.n ?? 0 : counts.reduce((a, c) => a + c.n, 0));
  const base = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "s" && k !== "durum") as [string, string][]);

  return (
    <>
      <PageHeader
        title="Siparişler"
        actions={
          <>
            {can(staff.permissions, "reports.finance") ? (
              <Button variant="outline" asChild>
                <a href={`/api/admin/export/orders?${new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][])}`}>
                  <Download size={16} /> CSV indir
                </a>
              </Button>
            ) : null}
            {can(staff.permissions, "orders.manage") ? (
              <Button asChild>
                <Link href="/admin/siparisler/yeni">
                  <Plus size={16} /> Telefon / showroom siparişi
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <div className="scrollbar-none mb-3 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const q = new URLSearchParams(base);
          if (t) q.set("durum", t);
          const active = (sp.durum ?? "") === t;
          return (
            <Link key={t || "all"} href={`/admin/siparisler?${q}`} className={`rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap ${active ? "bg-deep text-white" : "bg-white text-deep hover:bg-tint"}`}>
              {t ? ORDER_STATUS_LABEL[t] : "Tümü"} <span className={active ? "opacity-70" : "text-mute"}>{cnt(t)}</span>
            </Link>
          );
        })}
      </div>
      <Card className="mb-4 p-3">
        <form className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_150px_150px_150px_150px_auto]">
          {sp.durum ? <input type="hidden" name="durum" value={sp.durum} /> : null}
          <Input name="q" defaultValue={sp.q} placeholder="Sipariş no, ad, e-posta, telefon, takip no" />
          <Select name="odeme" defaultValue={sp.odeme ?? ""}>
            <option value="">Tüm ödemeler</option>
            <option value="CARD">Kart</option>
            <option value="TRANSFER">Havale</option>
          </Select>
          <Select name="teslim" defaultValue={sp.teslim ?? ""}>
            <option value="">Tüm teslimat</option>
            <option value="CARGO">Kargo</option>
            <option value="PICKUP">Showroom</option>
          </Select>
          <Input type="date" name="bas" defaultValue={sp.bas} aria-label="Başlangıç" />
          <Input type="date" name="bit" defaultValue={sp.bit} aria-label="Bitiş" />
          <Button type="submit" variant="dark">
            Filtrele
          </Button>
        </form>
      </Card>
      <OrderTable rows={rows} canManage={can(staff.permissions, "orders.manage")} />
      <Pagination page={page} per={PER} total={total} />
    </>
  );
}
