import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, replyTemplates, users } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, CardHeader, EmptyState, Field, Input, Select, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { storeVars } from "@/lib/templates";
import { TemplateInsert } from "@/components/admin/template-composer";
import { CHANNEL_LABEL, formatDate } from "@/lib/utils";
import { logConversation, reply, setConversation } from "./actions";

export const metadata = { title: "Mesajlar" };
const ST: Record<string, { label: string; tone: "gold" | "warn" | "ok" }> = { OPEN: { label: "Yanıt bekliyor", tone: "gold" }, PENDING: { label: "Müşteride", tone: "warn" }, CLOSED: { label: "Kapandı", tone: "ok" } };


export default async function InboxPage({ searchParams }: { searchParams: Promise<{ id?: string; durum?: string; yeni?: string }> }) {
  const staff = await requireStaff("inbox.manage");
  const sp = await searchParams;
  const status = (sp.durum ?? "OPEN") as "OPEN" | "PENDING" | "CLOSED" | "ALL";
  const [list, team, settings, templates] = await Promise.all([
    db.query.conversations.findMany({
      where: status === "ALL" ? undefined : eq(conversations.status, status),
      orderBy: desc(conversations.updatedAt),
      with: { messages: { orderBy: desc(messages.createdAt), limit: 1 }, assignee: { columns: { name: true } } },
      limit: 100,
    }),
    db.select({ id: users.id, name: users.name }).from(users).where(eq(users.isActive, true)),
    getSettings(),
    db.select({ id: replyTemplates.id, title: replyTemplates.title, category: replyTemplates.category, subject: replyTemplates.subject, body: replyTemplates.body }).from(replyTemplates).orderBy(asc(replyTemplates.sortOrder), asc(replyTemplates.title)),
  ]);
  const selId = sp.id ?? list[0]?.id;
  const sel = selId
    ? await db.query.conversations.findFirst({
        where: eq(conversations.id, selId),
        with: { messages: { orderBy: asc(messages.createdAt), with: { user: { columns: { name: true } } } }, customer: true, product: { columns: { name: true, slug: true } } },
      })
    : null;
  return (
    <>
      <PageHeader title="Mesajlar" description="Web formu, ürün soruları ve kayda geçirilen telefon/WhatsApp konuşmaları tek yerde." actions={<Link href="/admin/mesajlar?yeni=1" className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">+ Konuşma kaydet</Link>} />
      <div className="mb-3 flex gap-1">
        {(["OPEN", "PENDING", "CLOSED", "ALL"] as const).map((s) => (
          <Link key={s} href={`/admin/mesajlar?durum=${s}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${status === s ? "bg-deep text-white" : "bg-white hover:bg-tint"}`}>
            {s === "ALL" ? "Tümü" : ST[s].label}
          </Link>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="self-start overflow-hidden">
          <ul className="max-h-[72vh] divide-y divide-line overflow-y-auto">
            {list.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/mesajlar?id=${c.id}&durum=${status}`} className={`block px-4 py-3 hover:bg-soft ${c.id === selId ? "bg-tint" : ""}`}>
                  <span className="flex items-center justify-between gap-2">
                    <b className="truncate text-sm">{c.contactName}</b>
                    <span className="text-xs text-mute">{formatDate(c.updatedAt)}</span>
                  </span>
                  <span className="block truncate text-sm font-semibold">{c.subject}</span>
                  <span className="block truncate text-xs text-mute">{c.messages[0]?.body}</span>
                  <span className="mt-1 flex gap-1">
                    <Badge>{CHANNEL_LABEL[c.channel]}</Badge>
                    {c.assignee ? <Badge tone="brand">{c.assignee.name}</Badge> : <Badge tone="gold">Atanmadı</Badge>}
                  </span>
                </Link>
              </li>
            ))}
            {!list.length ? <li><EmptyState title="Bu listede mesaj yok" /></li> : null}
          </ul>
        </Card>

        {sp.yeni ? (
          <Card className="self-start">
            <CardHeader title="Konuşma kaydet" description="Telefon, WhatsApp veya mağazada gelen soruyu kayda geçir; müşteri kartına bağlanır." />
            <ActionForm action={logConversation} className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Kişi adı"><Input name="contactName" required /></Field>
              <Field label="Telefon veya e-posta"><Input name="contact" required /></Field>
              <Field label="Kanal">
                <Select name="channel" defaultValue="WHATSAPP">
                  {Object.entries(CHANNEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Konu"><Input name="subject" required /></Field>
              <Field label="Müşterinin mesajı / talebi" className="md:col-span-2"><Textarea name="body" required /></Field>
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : sel ? (
          <Card className="flex flex-col">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-bold">{sel.subject}</h2>
                <p className="text-sm text-mute">
                  {sel.contactName} · {sel.contact} · {CHANNEL_LABEL[sel.channel]}
                  {sel.customer ? <> · <Link className="font-bold text-link" href={`/admin/musteriler/${sel.customer.id}`}>Müşteri kartı</Link></> : null}
                  {sel.product ? <> · Ürün: <Link className="font-bold text-link" href={`/urun/${sel.product.slug}`} target="_blank">{sel.product.name}</Link></> : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={setConversation} className="flex gap-2">
                  <input type="hidden" name="id" value={sel.id} />
                  <Select name="assigneeId" defaultValue={sel.assigneeId ?? ""} className="h-9 w-44">
                    <option value="">Atanmadı</option>
                    {team.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <Select name="status" defaultValue={sel.status} className="h-9 w-40">
                    <option value="OPEN">Yanıt bekliyor</option>
                    <option value="PENDING">Müşteride</option>
                    <option value="CLOSED">Kapandı</option>
                  </Select>
                  <SubmitButton size="sm" variant="outline">Kaydet</SubmitButton>
                </ActionForm>
              </div>
            </div>
            <div className="flex max-h-[52vh] flex-col gap-3 overflow-y-auto bg-soft p-5">
              {sel.messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.fromStaff ? "self-end bg-brand text-white" : "self-start bg-white"}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-[11px] ${m.fromStaff ? "text-white/70" : "text-mute"}`}>{m.fromStaff ? m.user?.name ?? "Ekip" : sel.contactName} · {formatDate(m.createdAt, true)}</p>
                </div>
              ))}
            </div>
            <ActionForm action={reply} resetOnSuccess className="flex flex-col gap-2 border-t border-line p-4">
              <input type="hidden" name="conversationId" value={sel.id} />
              <Textarea name="body" placeholder="Yanıtını yaz… (WhatsApp/telefon konuşmalarında yanıtını buraya da not et)" required />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TemplateInsert templates={templates} vars={{ ...storeVars(settings.store, settings.payment.bankAccounts, staff.name), ad: sel.contactName.split(" ")[0], ad_soyad: sel.contactName }} />
                <Link href="/admin/sablonlar" className="text-xs font-semibold text-link">Şablonları düzenle</Link>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {sel.contact.startsWith("+") && settings.store.whatsapp ? (
                  <a href={`https://wa.me/${sel.contact.replace(/\D/g, "")}`} target="_blank" className="mr-auto text-sm font-bold text-[#128c4a]">WhatsApp&apos;ta aç →</a>
                ) : sel.contact.includes("@") ? (
                  <a href={`mailto:${sel.contact}?subject=${encodeURIComponent("Re: " + sel.subject)}`} className="mr-auto text-sm font-bold text-link">E-posta ile yanıtla →</a>
                ) : null}
                <SubmitButton variant="outline" name="close" value="1">Yanıtla ve kapat</SubmitButton>
                <SubmitButton>Yanıtla</SubmitButton>
              </div>
            </ActionForm>
          </Card>
        ) : (
          <Card><EmptyState title="Konuşma seçin" /></Card>
        )}
      </div>
      {staff ? null : null}
    </>
  );
}
