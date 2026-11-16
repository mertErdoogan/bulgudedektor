import Link from "next/link";
import { PageHeader } from "@/components/admin/shell";
import { Card, CardHeader, EmptyState, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { buildDigest } from "@/lib/digest";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Haftalık dikkat özeti" };

/** Pazartesi e-postayla giden özetin panel içi önizlemesi */
export default async function DigestPage() {
  await requireStaff("audit.view");
  const d = await buildDigest();
  return (
    <>
      <PageHeader
        title="Haftalık dikkat özeti"
        description={`${formatDate(d.since)} sonrasında dikkat isteyen ${d.total} işlem. Bu özet her pazartesi sabahı Ayarlar → Güvenlik'teki adrese e-postayla da gider.`}
        actions={<Link href="/admin/kayitlar" className="text-sm font-bold text-link">Tüm işlem kayıtları →</Link>}
      />
      <div className="flex flex-col gap-5" data-testid="digest">
        {d.sections.map((s) => (
          <Card key={s.title}>
            <CardHeader title={`${s.title} (${s.lines.length})`} description={s.why} />
            <Table>
              <thead><tr><Th>Zaman</Th><Th>Kim</Th><Th>İşlem</Th></tr></thead>
              <tbody>
                {s.lines.map((l, i) => (
                  <tr key={i}><Td className="whitespace-nowrap text-mute">{formatDate(l.at, true)}</Td><Td className="font-semibold whitespace-nowrap">{l.who}</Td><Td>{l.text}</Td></tr>
                ))}
              </tbody>
            </Table>
          </Card>
        ))}
        {!d.sections.length ? <Card><EmptyState title="Geçen hafta dikkat isteyen bir işlem olmadı" /></Card> : null}
      </div>
    </>
  );
}
