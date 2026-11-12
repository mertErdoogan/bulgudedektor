import { q } from "@/db/q";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, EmptyState, Input, Select, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { formatDate, formatTL } from "@/lib/utils";
import { ImportCustomers } from "./import-csv";

export const metadata = { title: "Müşteriler" };
const PER = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const staff = await requireStaff("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.s) || 1);
  const paid = sql`${q(orders.paymentStatus)} = 'PAID'`;
  const ltv = sql<number>`coalesce((select sum(${q(orders.total)}) from ${orders} where ${q(orders.customerId)} = ${q(customers.id)} and ${paid}),0)::float`;
  const cnt = sql<number>`(select count(*)::int from ${orders} where ${q(orders.customerId)} = ${q(customers.id)} and ${paid})`;
  const last = sql<Date | null>`(select max(${q(orders.createdAt)}) from ${orders} where ${q(orders.customerId)} = ${q(customers.id)})`;
  const conds: SQL[] = [];
  if (sp.q) conds.push(or(ilike(customers.name, `%${sp.q}%`), ilike(customers.email, `%${sp.q}%`), ilike(customers.phone, `%${sp.q.replace(/\s/g, "")}%`))!);
  if (sp.segment === "izinli") conds.push(eq(customers.marketingConsent, true));
  if (sp.segment === "vip") conds.push(sql`'VIP' = any(${customers.tags})`);
  if (sp.segment === "alici") conds.push(sql`${cnt} > 0`);
  if (sp.segment === "tekrar") conds.push(sql`${cnt} > 1`);
  if (sp.segment === "almadi") conds.push(sql`${cnt} = 0`);
  if (sp.segment === "uyuyan") conds.push(sql`${last} < now() - interval '180 days'`);
  const where = conds.length ? and(...conds) : undefined;
  const order = sp.sirala === "ltv" ? desc(ltv) : sp.sirala === "son" ? sql`${last} desc nulls last` : desc(customers.createdAt);
  const [rows, [{ total }]] = await Promise.all([
    db.select({ c: customers, ltv, cnt, last }).from(customers).where(where).orderBy(order).limit(PER).offset((page - 1) * PER),
    db.select({ total: sql<number>`count(*)::int` }).from(customers).where(where),
  ]);
  return (
    <>
      <PageHeader
        title="Müşteriler"
        description={`${total} müşteri`}
        actions={
          <>
            {can(staff.permissions, "customers.manage") ? (
              <Button variant="outline" asChild>
                <a href={`/api/admin/export/customers?segment=${sp.segment ?? ""}`}>
                  <Download size={16} /> CSV (izinliler)
                </a>
              </Button>
            ) : null}
            {can(staff.permissions, "customers.manage") ? (
              <Button variant="outline" asChild>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- dosya indirme */}
                <a href="/api/admin/export/customers?format=iys" download title="İleti Yönetim Sistemi'ne toplu izin yüklemek için">
                  <Download size={16} /> İYS listesi
                </a>
              </Button>
            ) : null}
            {can(staff.permissions, "customers.manage") ? <ImportCustomers /> : null}
            {can(staff.permissions, "customers.manage") ? <Button asChild><Link href="/admin/musteriler/yeni">+ Müşteri ekle</Link></Button> : null}
          </>
        }
      />
      <Card className="mb-4 p-3">
        <form className="grid gap-2 md:grid-cols-[1fr_220px_180px_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Ad, e-posta veya telefon" />
          <Select name="segment" defaultValue={sp.segment ?? ""}>
            <option value="">Tüm müşteriler</option>
            <option value="alici">Satın alanlar</option>
            <option value="tekrar">Tekrar alanlar (2+)</option>
            <option value="almadi">Hiç almayanlar</option>
            <option value="uyuyan">6 aydır almayanlar</option>
            <option value="vip">VIP etiketli</option>
            <option value="izinli">Pazarlama izni verenler</option>
          </Select>
          <Select name="sirala" defaultValue={sp.sirala ?? ""}>
            <option value="">En yeni</option>
            <option value="ltv">En çok harcayan</option>
            <option value="son">Son sipariş</option>
          </Select>
          <Button type="submit" variant="dark">Filtrele</Button>
        </form>
      </Card>
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Müşteri</Th>
                <Th>İletişim</Th>
                <Th className="text-right">Sipariş</Th>
                <Th className="text-right">Toplam harcama</Th>
                <Th>Son sipariş</Th>
                <Th>Etiket</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, ltv, cnt, last }) => (
                <tr key={c.id} className="hover:bg-soft/60">
                  <Td>
                    <Link href={`/admin/musteriler/${c.id}`} className="font-bold hover:text-link">{c.name}</Link>
                    <span className="block text-xs text-mute">Kayıt {formatDate(c.createdAt)}</span>
                  </Td>
                  <Td className="text-mute">
                    {c.phone ?? "—"}
                    <br />
                    <span className="text-xs">{c.email ?? ""}</span>
                  </Td>
                  <Td className="text-right">{cnt}</Td>
                  <Td className="text-right font-bold">{formatTL(ltv)}</Td>
                  <Td className="text-mute">{formatDate(last)}</Td>
                  <Td className="space-x-1">
                    {c.tags.map((t) => <Badge key={t} tone={t === "VIP" ? "gold" : "neutral"}>{t}</Badge>)}
                    {c.marketingConsent ? <Badge tone="brand">İzinli</Badge> : null}
                    {c.isBlocked ? <Badge tone="danger">Engelli</Badge> : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Müşteri bulunamadı" />
        )}
      </Card>
      <Pagination page={page} per={PER} total={total} />
    </>
  );
}
