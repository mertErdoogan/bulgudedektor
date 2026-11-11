import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { replyTemplates } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { TEMPLATE_CATEGORIES, TEMPLATE_VARS } from "@/lib/templates";
import { deleteTemplate, saveTemplate } from "./actions";

export const metadata = { title: "Hazır yanıtlar" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string }> }) {
  await requireStaff("inbox.manage");
  const sp = await searchParams;
  const rows = await db.select().from(replyTemplates).orderBy(asc(replyTemplates.category), asc(replyTemplates.sortOrder), asc(replyTemplates.title));
  const edit = sp.id ? await db.query.replyTemplates.findFirst({ where: eq(replyTemplates.id, sp.id) }) : null;
  const showForm = !!edit || sp.yeni === "1";
  return (
    <>
      <PageHeader
        title="Hazır yanıtlar"
        description="Müşterilere sık gönderilen mesajlar. Sipariş ve mesaj ekranlarında tek tıkla seçilir; {ad}, {siparis_no} gibi alanlar otomatik dolar."
        actions={
          <Button asChild>
            <Link href="/admin/sablonlar?yeni=1">
              <Plus size={16} /> Yeni şablon
            </Link>
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-3">
          {Object.entries(TEMPLATE_CATEGORIES).map(([cat, label]) => {
            const list = rows.filter((r) => r.category === cat);
            if (!list.length) return null;
            return (
              <Card key={cat}>
                <CardHeader title={label} description={`${list.length} şablon`} />
                <ul className="divide-y divide-line">
                  {list.map((t) => (
                    <li key={t.id} className={`flex items-start gap-3 px-5 py-3 ${edit?.id === t.id ? "bg-tint" : ""}`}>
                      <Link href={`/admin/sablonlar?id=${t.id}`} className="min-w-0 flex-1">
                        <span className="block font-bold">{t.title}</span>
                        <span className="line-clamp-2 text-sm whitespace-pre-line text-mute">{t.body}</span>
                      </Link>
                      <DeleteButton run={deleteTemplate.bind(null, t.id)} confirmText={`"${t.title}" silinsin mi?`} />
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          {!rows.length ? <Card className="p-10 text-center text-sm text-mute">Henüz şablon yok. &quot;Yeni şablon&quot; ile ekleyin.</Card> : null}
        </div>
        <div className="flex flex-col gap-4 self-start xl:sticky xl:top-20">
          {showForm ? (
            <Card>
              <CardHeader title={edit ? "Şablonu düzenle" : "Yeni şablon"} />
              <ActionForm action={saveTemplate} className="flex flex-col gap-4 p-5" key={edit?.id ?? "new"}>
                {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
                <Field label="Başlık">
                  <Input name="title" defaultValue={edit?.title} required placeholder="ör. Havale hatırlatma" />
                </Field>
                <Field label="Kategori">
                  <Select name="category" defaultValue={edit?.category ?? "genel"}>
                    {Object.entries(TEMPLATE_CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="E-posta konusu" hint="E-postayla gönderilirken kullanılır (isteğe bağlı)">
                  <Input name="subject" defaultValue={edit?.subject ?? ""} />
                </Field>
                <Field label="Metin">
                  <Textarea name="body" rows={9} defaultValue={edit?.body} required />
                </Field>
                <div className="flex gap-2">
                  <SubmitButton>Kaydet</SubmitButton>
                  <Button variant="outline" asChild>
                    <Link href="/admin/sablonlar">Vazgeç</Link>
                  </Button>
                </div>
              </ActionForm>
            </Card>
          ) : null}
          <Card className="p-5 text-sm">
            <b>Kullanılabilir alanlar</b>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {TEMPLATE_VARS.map((v) => (
                <li key={v.key}>
                  <Badge className="font-mono">{`{${v.key}}`}</Badge> <span className="text-mute">{v.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-mute">Sipariş dışı ekranlarda (ör. genel mesajlar) siparişe ait alanlar boş kalır; gönderimden önce metin uyarır.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
