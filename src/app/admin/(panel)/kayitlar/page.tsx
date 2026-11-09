import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, Input, Select, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { sql } from "drizzle-orm";

export const metadata = { title: "İşlem kayıtları" };
const PER = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.s) || 1);
  const c: SQL[] = [];
  if (sp.kisi) c.push(eq(auditLogs.userId, sp.kisi));
  if (sp.tur) c.push(eq(auditLogs.entity, sp.tur));
  if (sp.q) c.push(ilike(auditLogs.summary, `%${sp.q}%`));
  const where = c.length ? and(...c) : undefined;
  const [rows, [{ total }], team, entities] = await Promise.all([
    db.select({ a: auditLogs, user: users.name }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.userId)).where(where).orderBy(desc(auditLogs.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
    db.select({ id: users.id, name: users.name }).from(users),
    db.selectDistinct({ e: auditLogs.entity }).from(auditLogs),
  ]);
  return (
    <>
      <PageHeader title="İşlem kayıtları" description="Kim, ne zaman, neyi değiştirdi. Silinemez." />
      <Card className="mb-4 p-3">
        <form className="grid gap-2 md:grid-cols-[1fr_200px_200px_auto]">
          <Input name="q" defaultValue={sp.q} placeholder="Açıklamada ara" />
          <Select name="kisi" defaultValue={sp.kisi ?? ""}><option value="">Herkes</option>{team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <Select name="tur" defaultValue={sp.tur ?? ""}><option value="">Tüm kayıtlar</option>{entities.map((e) => <option key={e.e} value={e.e}>{e.e}</option>)}</Select>
          <Button variant="dark">Filtrele</Button>
        </form>
      </Card>
      <Card>
        <Table>
          <thead><tr><Th>Zaman</Th><Th>Kişi</Th><Th>İşlem</Th><Th>Açıklama</Th></tr></thead>
          <tbody>
            {rows.map(({ a, user }) => (
              <tr key={a.id}>
                <Td className="whitespace-nowrap text-mute">{formatDate(a.createdAt, true)}</Td>
                <Td>{user ?? "Sistem"}</Td>
                <Td><Badge>{a.entity}</Badge> <Badge tone={a.action === "delete" ? "danger" : a.action === "create" ? "ok" : "neutral"}>{a.action}</Badge></Td>
                <Td>{a.summary}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <Pagination page={page} per={PER} total={total} />
    </>
  );
}
