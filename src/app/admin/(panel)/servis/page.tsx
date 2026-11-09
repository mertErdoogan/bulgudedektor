import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { serviceRecords, users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageHeader } from "@/components/admin/shell";
import { ServiceStatusBadge } from "@/components/admin/status";
import { Badge, Card, CardHeader, Checkbox, EmptyState, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { SERVICE_STATUS_LABEL, formatDate, formatTL, serviceNo } from "@/lib/utils";
import { createService, updateService } from "./actions";

export const metadata = { title: "Servis" };

export default async function ServicePage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string; tumu?: string }> }) {
  await requireStaff("service.manage");
  const sp = await searchParams;
  const [rows, team] = await Promise.all([
    db.query.serviceRecords.findMany({ where: sp.tumu ? undefined : sql`${serviceRecords.status} <> 'CLOSED'`, orderBy: desc(serviceRecords.createdAt), with: { assignee: { columns: { name: true } } }, limit: 200 }),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true)),
  ]);
  const sel = sp.id ? await db.query.serviceRecords.findFirst({ where: eq(serviceRecords.id, sp.id), with: { customer: true } }) : null;
  const age = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86400000);
  return (
    <>
      <PageHeader
        title="Teknik servis"
        description="Kayıt → cihaz bekleniyor → tamirde → hazır → kargoda. Müşteri her adımı hesabından ve servis sorgu sayfasından görür. Yasal azami tamir süresi 20 iş günüdür."
        actions={
          <>
            <Link href={sp.tumu ? "/admin/servis" : "/admin/servis?tumu=1"} className="rounded-lg bg-white px-4 py-2 text-sm font-bold">{sp.tumu ? "Sadece açıklar" : "Kapananları da göster"}</Link>
            <Link href="/admin/servis?yeni=1" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">+ Servis kaydı aç</Link>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          {rows.length ? (
            <Table>
              <thead><tr><Th>Kayıt</Th><Th>Ürün</Th><Th>Müşteri</Th><Th>Gün</Th><Th>Durum</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={r.id === sel?.id ? "bg-tint" : "hover:bg-soft/60"}>
                    <Td><Link href={`/admin/servis?id=${r.id}`} className="font-bold text-link">{serviceNo(r.number)}</Link><span className="block text-xs text-mute">{r.assignee?.name ?? "Atanmadı"}</span></Td>
                    <Td>{r.productName}<span className="block font-mono text-xs text-mute">{r.serial ?? ""}</span></Td>
                    <Td>{r.contactName}</Td>
                    <Td><Badge tone={age(r.createdAt) > 15 && r.status !== "CLOSED" ? "danger" : "neutral"}>{age(r.createdAt)}</Badge></Td>
                    <Td><ServiceStatusBadge status={r.status} />{r.underWarranty ? null : <Badge tone="gold" className="ml-1">Ücretli</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : <EmptyState title="Açık servis kaydı yok" />}
        </Card>
        {sp.yeni ? (
          <Card className="self-start">
            <CardHeader title="Yeni servis kaydı" />
            <ActionForm action={createService} className="flex flex-col gap-3 p-5">
              <Field label="Müşteri adı"><Input name="contactName" required /></Field>
              <Field label="Telefon veya e-posta"><Input name="contact" required /></Field>
              <Field label="Ürün"><Input name="productName" required placeholder="Örn. Equinox 900" /></Field>
              <Field label="Seri no" hint="Girilirse garanti durumu otomatik kontrol edilir"><Input name="serial" className="font-mono" /></Field>
              <Field label="Arıza"><Textarea name="issue" required /></Field>
              <Checkbox name="underWarranty" defaultChecked label="Garanti kapsamında" />
              <SubmitButton>Kaydı aç</SubmitButton>
            </ActionForm>
          </Card>
        ) : sel ? (
          <Card className="self-start">
            <CardHeader title={`${serviceNo(sel.number)} · ${sel.productName}`} description={`${sel.contactName} · ${sel.contact}`} action={sel.customer ? <Link href={`/admin/musteriler/${sel.customer.id}`} className="text-sm font-bold text-link">Müşteri →</Link> : null} />
            <div className="flex flex-col gap-4 p-5 text-sm">
              <p className="rounded-lg bg-soft p-3"><b>Arıza:</b> {sel.issue}</p>
              <ol className="flex flex-col gap-2">
                {sel.history.map((h, i) => (
                  <li key={i} className="border-l-2 border-brand pl-3">
                    <b>{SERVICE_STATUS_LABEL[h.status] ?? h.status}</b> <span className="text-xs text-mute">{formatDate(h.at, true)} {h.by ? `· ${h.by}` : ""}</span>
                    {h.note ? <p className="text-mute">{h.note}</p> : null}
                  </li>
                ))}
              </ol>
              <ActionForm action={updateService} key={sel.id + sel.status} className="flex flex-col gap-3 border-t border-line pt-4">
                <input type="hidden" name="id" value={sel.id} />
                <Field label="Durum">
                  <Select name="status" defaultValue={sel.status}>
                    {Object.entries(SERVICE_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
                <Field label="Not (müşteri görür)"><Textarea name="note" className="min-h-[60px]" placeholder="Örn. Bobin kablosu değiştirildi, test edildi." /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sorumlu">
                    <Select name="assigneeId" defaultValue={sel.assigneeId ?? ""}>
                      <option value="">—</option>
                      {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Ücret (TL)"><Input name="cost" inputMode="decimal" defaultValue={sel.cost ?? ""} /></Field>
                </div>
                <Checkbox name="underWarranty" defaultChecked={sel.underWarranty} label="Garanti kapsamında (ücretsiz)" />
                {sel.cost ? <p className="text-mute">Müşteriye bildirilecek ücret: {formatTL(sel.cost)}</p> : null}
                <SubmitButton>Güncelle</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
