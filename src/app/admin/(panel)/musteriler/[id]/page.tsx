import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, customerNotes, customers, orders, serviceRecords } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ActionButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { OrderStatusBadge, ServiceStatusBadge } from "@/components/admin/status";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Stat, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { CHANNEL_LABEL, formatDate, formatTL, orderNo, serviceNo } from "@/lib/utils";
import { addNote, anonymizeCustomer, deleteNote, saveCustomer } from "../actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff("customers.view");
  const { id } = await params;
  const isNew = id === "yeni";
  const c = isNew
    ? null
    : await db.query.customers.findFirst({
        where: eq(customers.id, id),
        with: {
          addresses: true,
          orders: { orderBy: desc(orders.createdAt), with: { items: { columns: { name: true, quantity: true } } } },
          notes: { orderBy: desc(customerNotes.createdAt), with: { user: { columns: { name: true } } } },
          conversations: { orderBy: desc(conversations.updatedAt) },
          serviceRecords: { orderBy: desc(serviceRecords.createdAt) },
        },
      });
  if (!isNew && !c) notFound();
  const manage = can(staff.permissions, "customers.manage");
  const paid = c?.orders.filter((o) => o.paymentStatus === "PAID") ?? [];
  const ltv = paid.reduce((s, o) => s + o.total, 0);

  const form = (
    <Card>
      <CardHeader title={isNew ? "Yeni müşteri" : "Bilgiler"} />
      <ActionForm action={saveCustomer} className="flex flex-col gap-3 p-5">
        {c ? <input type="hidden" name="id" value={c.id} /> : null}
        <fieldset disabled={!manage} className="flex flex-col gap-3">
          <Field label="Ad soyad"><Input name="name" defaultValue={c?.name} required /></Field>
          <Field label="Telefon"><Input name="phone" defaultValue={c?.phone ?? ""} /></Field>
          <Field label="E-posta"><Input name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
          <Field label="Etiketler" hint="Virgülle: VIP, Bayi, Kurumsal"><Input name="tags" defaultValue={c?.tags.join(", ")} /></Field>
          <Checkbox name="marketingConsent" defaultChecked={c?.marketingConsent} label={`Ticari ileti izni (İYS)${c?.consentAt ? ` · ${formatDate(c.consentAt)}` : ""}`} />
          <Checkbox name="isBlocked" defaultChecked={c?.isBlocked} label="Engelli (giriş ve sipariş yapamaz)" />
          {manage ? <SubmitButton>{isNew ? "Müşteri ekle" : "Kaydet"}</SubmitButton> : null}
        </fieldset>
      </ActionForm>
    </Card>
  );

  if (isNew) return (<><PageHeader title="Yeni müşteri" /><div className="max-w-lg">{form}</div></>);
  if (!c) notFound();

  return (
    <>
      <PageHeader
        title={c.name}
        description={<span className="space-x-1">{c.tags.map((t) => <Badge key={t} tone="gold">{t}</Badge>)} <span>Müşteri {formatDate(c.createdAt)} tarihinden beri</span></span>}
        actions={
          <>
            {c.phone ? <a className="rounded-lg bg-[#15803d] px-4 py-2 text-sm font-bold text-white" href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank">WhatsApp</a> : null}
            <Link href="/admin/musteriler" className="px-2 py-2 text-sm font-bold text-link">← Müşteriler</Link>
          </>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Toplam harcama" value={formatTL(ltv)} />
        <Stat label="Sipariş" value={paid.length} sub={`${c.orders.length - paid.length} ödenmemiş/iptal`} />
        <Stat label="Ortalama sepet" value={formatTL(paid.length ? ltv / paid.length : 0)} />
        <Stat label="Son sipariş" value={c.orders[0] ? formatDate(c.orders[0].createdAt) : "—"} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Siparişler" />
            <Table>
              <thead><tr><Th>Sipariş</Th><Th>Ürünler</Th><Th>Durum</Th><Th className="text-right">Tutar</Th></tr></thead>
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <Td><Link href={`/admin/siparisler/${o.id}`} className="font-bold text-link">{orderNo(o.number)}</Link><span className="block text-xs text-mute">{formatDate(o.createdAt)}</span></Td>
                    <Td className="text-mute">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</Td>
                    <Td><OrderStatusBadge status={o.status} /></Td>
                    <Td className="text-right font-bold">{formatTL(o.total)}</Td>
                  </tr>
                ))}
                {!c.orders.length ? <tr><Td colSpan={4} className="py-6 text-center text-mute">Sipariş yok.</Td></tr> : null}
              </tbody>
            </Table>
          </Card>
          <Card>
            <CardHeader title="Notlar" description="Görüşme notları, tercih ve bütçe bilgisi. Sadece ekip görür." />
            {manage ? (
              <ActionForm action={addNote} resetOnSuccess className="flex flex-col gap-2 border-b border-line p-5">
                <input type="hidden" name="customerId" value={c.id} />
                <Textarea name="body" placeholder="Örn. Sahil + tarla kullanacak, bütçe 50 bin, pazartesi aranacak." className="min-h-[70px]" />
                <SubmitButton size="sm" className="self-end">Not ekle</SubmitButton>
              </ActionForm>
            ) : null}
            <ul className="divide-y divide-line">
              {c.notes.map((n) => (
                <li key={n.id} className="flex gap-3 px-5 py-3 text-sm">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <p className="mt-1 text-xs text-mute">{n.user?.name ?? "—"} · {formatDate(n.createdAt, true)}</p>
                  </div>
                  {manage ? <ActionButton variant="ghost" size="sm" run={deleteNote.bind(null, n.id)} confirmText="Not silinsin mi?">Sil</ActionButton> : null}
                </li>
              ))}
              {!c.notes.length ? <li className="px-5 py-6 text-center text-sm text-mute">Henüz not yok.</li> : null}
            </ul>
          </Card>
          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <CardHeader title="Mesajlar" />
              <ul className="divide-y divide-line">
                {c.conversations.map((m) => (
                  <li key={m.id} className="px-5 py-3 text-sm">
                    <Link href={`/admin/mesajlar?id=${m.id}`} className="font-semibold hover:text-link">{m.subject}</Link>
                    <span className="block text-xs text-mute">{CHANNEL_LABEL[m.channel]} · {formatDate(m.updatedAt)}</span>
                  </li>
                ))}
                {!c.conversations.length ? <li className="px-5 py-6 text-center text-sm text-mute">Mesaj yok.</li> : null}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Servis kayıtları" />
              <ul className="divide-y divide-line">
                {c.serviceRecords.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <Link href={`/admin/servis?id=${s.id}`} className="font-semibold hover:text-link">{serviceNo(s.number)} · {s.productName}</Link>
                    <ServiceStatusBadge status={s.status} />
                  </li>
                ))}
                {!c.serviceRecords.length ? <li className="px-5 py-6 text-center text-sm text-mute">Kayıt yok.</li> : null}
              </ul>
            </Card>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          {form}
          <Card>
            <CardHeader title="Adresler" />
            <ul className="divide-y divide-line">
              {c.addresses.map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <b>{a.title}</b> {a.isDefault ? <Badge tone="brand">Varsayılan</Badge> : null}
                  <p className="text-mute">{a.fullName} · {a.phone}<br />{a.line}, {a.district}/{a.city}</p>
                </li>
              ))}
              {!c.addresses.length ? <li className="px-5 py-6 text-center text-sm text-mute">Kayıtlı adres yok.</li> : null}
            </ul>
          </Card>
          {can(staff.permissions, "users.manage") ? (
            <Card className="border-danger/20">
              <CardHeader title="KVKK silme talebi" description="Kişisel veriler anonimleştirilir; fatura ve sipariş kayıtları yasal süre boyunca saklanır." />
              <div className="p-5">
                <ActionButton variant="danger" run={anonymizeCustomer.bind(null, c.id)} confirmText="Müşterinin kişisel verileri geri alınamaz şekilde anonimleştirilecek. Emin misin?">
                  Verileri anonimleştir
                </ActionButton>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
