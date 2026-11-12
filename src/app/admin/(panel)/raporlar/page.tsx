import { q } from "@/db/q";
import Link from "next/link";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { customers, orders, products } from "@/db/schema";
import { BarList, SalesChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/shell";
import { Button, Card, CardHeader, Input, Stat, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { cityBreakdown, dailySeries, paymentBreakdown, rangeFromParam, salesByGroup, salesSummary, sourceBreakdown, topProducts } from "@/lib/reports";
import { formatTL } from "@/lib/utils";

export const metadata = { title: "Raporlar" };
const RANGES = [["1", "Bugün"], ["7", "7 gün"], ["30", "30 gün"], ["90", "90 gün"], ["365", "1 yıl"]];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ r?: string; bas?: string; bit?: string }> }) {
  await requireStaff("reports.finance");
  const sp = await searchParams;
  const { start, end } = rangeFromParam(sp.r, sp.bas, sp.bit);
  const span = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - span);
  const [sum, prev, series, top, byBrand, byCat, pay, cities, [newCust], [repeat], [stockVal], sources] = await Promise.all([
    salesSummary(start, end),
    salesSummary(prevStart, start),
    dailySeries(start, end),
    topProducts(start, end, 15),
    salesByGroup(start, end, "brand"),
    salesByGroup(start, end, "category"),
    paymentBreakdown(start, end),
    cityBreakdown(start, end),
    db.select({ n: sql<number>`count(*)::int` }).from(customers).where(and(gte(customers.createdAt, start), lt(customers.createdAt, end))),
    db.select({
      buyers: sql<number>`count(distinct ${orders.customerId})::int`,
      repeaters: sql<number>`count(*) filter (where c > 1)::int`,
    }).from(sql`(select ${q(orders.customerId)}, count(*) c from ${orders} where ${q(orders.paymentStatus)} = 'PAID' group by 1) t`),
    db.select({ cost: sql<number>`coalesce(sum(${products.stock} * coalesce(${products.costPrice},0)),0)::float`, retail: sql<number>`coalesce(sum(${products.stock} * ${products.price}),0)::float`, units: sql<number>`coalesce(sum(${products.stock}),0)::int` }).from(products).where(eq(products.status, "ACTIVE")),
    sourceBreakdown(start, end),
  ]);
  const pct = (a: number, b: number) => (b ? ((a - b) / b) * 100 : 0);
  const delta = (a: number, b: number) => {
    const p = pct(a, b);
    return { sub: `${p >= 0 ? "▲" : "▼"} %${Math.abs(p).toFixed(1)} önceki döneme göre`, tone: (p >= 0 ? "ok" : "danger") as "ok" | "danger" };
  };
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();
  const cardInst = pay.filter((p) => p.method === "CARD");
  return (
    <>
      <PageHeader
        title="Raporlar"
        description={`${start.toLocaleDateString("tr-TR")} – ${end.toLocaleDateString("tr-TR")} · ödenmiş siparişler (iptal/iade hariç)`}
        actions={
          <>
            <Button variant="outline" asChild><a href={`/api/admin/export/report?tip=gunluk&${qs}`}><Download size={16} /> Günlük satış CSV</a></Button>
            <Button variant="outline" asChild><a href={`/api/admin/export/report?tip=urun&${qs}`}><Download size={16} /> Ürün bazlı CSV</a></Button>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {RANGES.map(([v, l]) => (
          <Link key={v} href={`/admin/raporlar?r=${v}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${(sp.r ?? "30") === v && !sp.bas ? "bg-deep text-white" : "bg-white hover:bg-tint"}`}>{l}</Link>
        ))}
        <form className="ml-auto flex items-center gap-2">
          <Input type="date" name="bas" defaultValue={sp.bas} className="h-9 w-40" aria-label="Başlangıç" />
          <Input type="date" name="bit" defaultValue={sp.bit} className="h-9 w-40" aria-label="Bitiş" />
          <Button size="sm" variant="dark">Uygula</Button>
        </form>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ciro" value={formatTL(sum.revenue)} {...delta(sum.revenue, prev.revenue)} />
        <Stat label="Sipariş" value={sum.orders} {...delta(sum.orders, prev.orders)} />
        <Stat label="Ortalama sepet" value={formatTL(sum.aov)} {...delta(sum.aov, prev.aov)} />
        <Stat label="Brüt kâr" value={formatTL(sum.grossProfit)} sub={sum.revenue ? `Marj %${((sum.grossProfit / sum.revenue) * 100).toFixed(1)} · ${sum.units} ürün` : "—"} />
        <Stat label="Verilen indirim" value={formatTL(sum.discount)} />
        <Stat label="İptal / iade" value={sum.cancelled} sub={formatTL(sum.cancelledAmount)} tone={sum.cancelled ? "warn" : undefined} />
        <Stat label="Yeni müşteri" value={newCust.n} />
        <Stat label="Tekrar alan müşteri" value={repeat.buyers ? `%${((repeat.repeaters / repeat.buyers) * 100).toFixed(0)}` : "—"} sub={`${repeat.repeaters} / ${repeat.buyers} alıcı (tüm zamanlar)`} />
      </div>
      <Card className="mt-5">
        <CardHeader title="Günlük satış" />
        <div className="p-4"><SalesChart data={series} /></div>
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card><CardHeader title="Markaya göre" /><div className="p-4"><BarList data={byBrand.map((b) => ({ label: b.label, value: b.value }))} /></div></Card>
        <Card><CardHeader title="Kategoriye göre" /><div className="p-4"><BarList data={byCat.map((b) => ({ label: b.label, value: b.value }))} /></div></Card>
      </div>
      <Card className="mt-5">
        <CardHeader title="Ürün performansı" description="En çok ciro getiren 15 ürün" />
        <Table>
          <thead><tr><Th>Ürün</Th><Th className="text-right">Adet</Th><Th className="text-right">Ciro</Th><Th className="text-right">Maliyet</Th><Th className="text-right">Brüt kâr</Th><Th className="text-right">Marj</Th></tr></thead>
          <tbody>
            {top.map((p) => (
              <tr key={p.name}>
                <Td className="font-semibold">{p.productId ? <Link href={`/admin/urunler/${p.productId}`} className="hover:text-link">{p.name}</Link> : p.name}</Td>
                <Td className="text-right">{p.units}</Td>
                <Td className="text-right font-bold">{formatTL(p.revenue)}</Td>
                <Td className="text-right text-mute">{formatTL(p.cost)}</Td>
                <Td className="text-right">{formatTL(p.revenue - p.cost)}</Td>
                <Td className="text-right">{p.cost ? `%${(((p.revenue - p.cost) / p.revenue) * 100).toFixed(0)}` : "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title="Ödeme ve taksit" />
          <Table>
            <thead><tr><Th>Yöntem</Th><Th className="text-right">Sipariş</Th><Th className="text-right">Tutar</Th></tr></thead>
            <tbody>
              {pay.map((p) => (
                <tr key={`${p.method}${p.installments}`}>
                  <Td>{p.method === "CARD" ? (p.installments > 1 ? `Kart · ${p.installments} taksit` : "Kart · tek çekim") : "Havale / EFT"}</Td>
                  <Td className="text-right">{p.n}</Td>
                  <Td className="text-right">{formatTL(p.value)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <p className="px-5 py-3 text-xs text-mute">Taksitli satış oranı: %{cardInst.length ? ((cardInst.filter((p) => p.installments > 1).reduce((s, p) => s + p.n, 0) / Math.max(1, cardInst.reduce((s, p) => s + p.n, 0))) * 100).toFixed(0) : 0}</p>
        </Card>
        <Card>
          <CardHeader title="Satış kaynağı" description="Siparişin geldiği reklam / kanal (son tıklama)" />
          <Table>
            <thead><tr><Th>Kaynak</Th><Th className="text-right">Sipariş</Th><Th className="text-right">Tutar</Th></tr></thead>
            <tbody>{sources.length ? sources.map((c) => <tr key={c.label}><Td>{c.label}</Td><Td className="text-right">{c.n}</Td><Td className="text-right">{formatTL(c.value)}</Td></tr>) : <tr><Td colSpan={3} className="text-mute">Bu dönemde satış yok</Td></tr>}</tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="İllere göre" />
          <Table>
            <thead><tr><Th>İl</Th><Th className="text-right">Sipariş</Th><Th className="text-right">Tutar</Th></tr></thead>
            <tbody>{cities.map((c) => <tr key={c.label}><Td>{c.label}</Td><Td className="text-right">{c.n}</Td><Td className="text-right">{formatTL(c.value)}</Td></tr>)}</tbody>
          </Table>
        </Card>
        <Card>
          <CardHeader title="Stok değeri" description="Yayındaki ürünler, şu an" />
          <div className="flex flex-col gap-3 p-5 text-sm">
            <div className="flex justify-between"><span>Toplam adet</span><b>{stockVal.units}</b></div>
            <div className="flex justify-between"><span>Maliyet değeri</span><b>{formatTL(stockVal.cost)}</b></div>
            <div className="flex justify-between"><span>Satış değeri</span><b>{formatTL(stockVal.retail)}</b></div>
            <div className="flex justify-between text-ok"><span>Potansiyel brüt kâr</span><b>{formatTL(stockVal.retail - stockVal.cost)}</b></div>
          </div>
        </Card>
      </div>
    </>
  );
}
