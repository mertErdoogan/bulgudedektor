import Link from "next/link";
import { and, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PAYMENT_METHOD_LABEL, formatDate, formatTL, orderNo } from "@/lib/utils";
import { CashCount } from "./cash-count";
import { PrintButton } from "./print-button";

export const metadata = { title: "Gün sonu kasa" };

/** İstanbul günü: YYYY-MM-DD */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

/**
 * Gün sonu: o gün tahsil edilen paranın ödeme yöntemine göre dökümü.
 * Akşam POS gün sonu fişi ve kasa sayımıyla karşılaştırmak için. Yönetici herkesi, personel yalnızca kendi satışlarını görür.
 */
export default async function CashPage({ searchParams }: { searchParams: Promise<{ gun?: string }> }) {
  const staff = await requireStaff("orders.manage");
  const sp = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(sp.gun ?? "") ? sp.gun! : today();
  const start = new Date(`${day}T00:00:00+03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const all = can(staff.permissions, "reports.finance");

  const where: SQL[] = [gte(orders.paidAt, start), lt(orders.paidAt, end), inArray(orders.paymentStatus, ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"])];
  if (!all) where.push(eq(orders.salesUserId, staff.id));
  const rows = await db
    .select({ id: orders.id, number: orders.number, total: orders.total, method: orders.paymentMethod, channel: orders.channel, paidAt: orders.paidAt, status: orders.status, paymentStatus: orders.paymentStatus, manualDiscount: orders.manualDiscount, seller: users.name, sellerId: orders.salesUserId })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.salesUserId))
    .where(and(...where))
    .orderBy(orders.paidAt);

  // Mağazada elle alınan para (nakit, POS, havale) ile sitede/pazaryerinde alınan para ayrı tutulur: kasa ve POS fişi yalnızca ilkini içerir
  const inStore = rows.filter((r) => r.channel === "MANUAL");
  const sum = (xs: typeof rows) => xs.reduce((s, r) => s + r.total, 0);
  const tiles = [
    { k: "CASH", label: "Nakit (kasada olmalı)", v: sum(inStore.filter((r) => r.method === "CASH")), n: inStore.filter((r) => r.method === "CASH").length, tone: "text-[#0f766e]" },
    { k: "POS", label: "Kart · POS cihazı", v: sum(inStore.filter((r) => r.method === "CARD")), n: inStore.filter((r) => r.method === "CARD").length, tone: "text-[#1d4ed8]" },
    { k: "TRANSFER", label: "Havale / EFT", v: sum(rows.filter((r) => r.method === "TRANSFER")), n: rows.filter((r) => r.method === "TRANSFER").length, tone: "text-[#9a5b06]" },
    { k: "ONLINE", label: "Online kart (site, PayTR)", v: sum(rows.filter((r) => r.channel !== "MANUAL" && r.method === "CARD")), n: rows.filter((r) => r.channel !== "MANUAL" && r.method === "CARD").length, tone: "text-[#6d28d9]" },
  ];
  const cash = tiles[0].v;

  // Personel bazında (yalnızca mağaza satışları; prim ve indirim kontrolü)
  const bySeller = new Map<string, { name: string; n: number; total: number; discount: number }>();
  for (const r of inStore) {
    const key = r.sellerId ?? "-";
    const cur = bySeller.get(key) ?? { name: r.seller ?? "Belirtilmemiş", n: 0, total: 0, discount: 0 };
    cur.n++;
    cur.total += r.total;
    cur.discount += r.manualDiscount;
    bySeller.set(key, cur);
  }
  const prev = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const next = new Date(end.getTime() + 12 * 60 * 60 * 1000);
  const ymd = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(d);

  return (
    <>
      <PageHeader
        title="Gün sonu kasa"
        description={`${formatDate(start)} · ${all ? "tüm mağaza" : "yalnızca senin satışların"}. Akşam POS gün sonu fişi ve kasa sayımıyla karşılaştır.`}
        actions={
          <>
            <Button variant="outline" asChild><Link href={`/admin/kasa?gun=${ymd(prev)}`}>← Önceki gün</Link></Button>
            {day !== today() ? <Button variant="outline" asChild><Link href={`/admin/kasa?gun=${ymd(next)}`}>Sonraki gün →</Link></Button> : null}
            <PrintButton />
          </>
        }
      />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="cash-tiles">
          {tiles.map((t) => (
            <Card key={t.k} className="p-4">
              <p className="text-xs font-bold text-mute">{t.label}</p>
              <p className={`font-display mt-1 text-2xl font-extrabold ${t.tone}`} data-testid={`cash-${t.k}`}>{formatTL(t.v)}</p>
              <p className="text-xs text-mute">{t.n} işlem</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Kasa sayımı" description="Kasadaki nakdi say, buraya yaz. Fark varsa aynı gün araştır." />
            <CashCount expected={cash} />
          </Card>
          <Card>
            <CardHeader title="Personel bazında mağaza satışı" description="Showroom ve telefon satışları; verilen satış indirimi dahil." />
            <Table>
              <thead>
                <tr><Th>Personel</Th><Th className="text-right">Satış</Th><Th className="text-right">Tutar</Th><Th className="text-right">Verdiği indirim</Th></tr>
              </thead>
              <tbody>
                {[...bySeller.values()].map((b) => (
                  <tr key={b.name}><Td className="font-semibold">{b.name}</Td><Td className="text-right">{b.n}</Td><Td className="text-right font-bold">{formatTL(b.total)}</Td><Td className="text-right">{b.discount ? formatTL(b.discount) : "—"}</Td></tr>
                ))}
                {!bySeller.size ? <tr><Td colSpan={4} className="py-6 text-center text-mute">Bugün mağaza satışı yok.</Td></tr> : null}
              </tbody>
            </Table>
          </Card>
        </div>

        <Card>
          <CardHeader title="Günün tahsilatları" description="Ödemesi bu gün alınan tüm siparişler (iade edilenler işaretli)." />
          <Table>
            <thead>
              <tr><Th>Saat</Th><Th>Sipariş</Th><Th>Kanal</Th><Th>Ödeme</Th><Th>Satan</Th><Th className="text-right">Tutar</Th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="text-mute">{r.paidAt ? new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", hour: "2-digit", minute: "2-digit" }).format(r.paidAt) : "—"}</Td>
                  <Td><Link href={`/admin/siparisler/${r.id}`} className="font-bold text-link">{orderNo(r.number)}</Link></Td>
                  <Td>{r.channel === "MANUAL" ? "Mağaza / telefon" : r.channel === "WEB" ? "Site" : r.channel}</Td>
                  <Td>{PAYMENT_METHOD_LABEL[r.method]}{r.paymentStatus !== "PAID" ? <> <Badge tone="warn">İade edildi</Badge></> : null}</Td>
                  <Td className="text-mute">{r.seller ?? "—"}</Td>
                  <Td className="text-right font-bold">{formatTL(r.total)}</Td>
                </tr>
              ))}
              {!rows.length ? <tr><Td colSpan={6} className="py-8 text-center text-mute">Bu gün tahsilat yok.</Td></tr> : null}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
