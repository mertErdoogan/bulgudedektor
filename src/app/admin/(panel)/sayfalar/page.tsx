import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deletePage, savePage } from "../vitrin/actions";

export const metadata = { title: "Sayfalar" };

export default async function PagesPage({ searchParams }: { searchParams: Promise<{ id?: string; yeni?: string }> }) {
  await requireStaff("cms.manage");
  const sp = await searchParams;
  const rows = await db.select().from(pages).orderBy(asc(pages.footerGroup), asc(pages.title));
  const edit = sp.id ? rows.find((r) => r.id === sp.id) : undefined;
  const show = !!edit || !!sp.yeni;
  return (
    <>
      <PageHeader title="Sayfalar" description="Sözleşmeler, KVKK, hakkımızda gibi içerik sayfaları. Markdown veya HTML yazabilirsiniz." actions={<Button asChild><Link href="/admin/sayfalar?yeni=1">+ Sayfa ekle</Link></Button>} />
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="self-start">
          <ul className="divide-y divide-line">
            {rows.map((p) => (
              <li key={p.id} className={`flex items-center justify-between gap-2 px-4 py-3 ${p.id === sp.id ? "bg-tint" : ""}`}>
                <Link href={`/admin/sayfalar?id=${p.id}`} className="text-sm">
                  <b className="hover:text-link">{p.title}</b>
                  <span className="block text-xs text-mute">/sayfa/{p.slug} · {formatDate(p.updatedAt)}</span>
                </Link>
                {p.isPublished ? <Badge tone="ok">Yayında</Badge> : <Badge>Taslak</Badge>}
              </li>
            ))}
          </ul>
        </Card>
        {show ? (
          <Card>
            <CardHeader title={edit ? edit.title : "Yeni sayfa"} action={edit ? <DeleteButton run={deletePage.bind(null, edit.id)} confirmText="Sayfa silinsin mi?" /> : null} />
            <ActionForm action={savePage} key={edit?.id ?? "new"} className="grid gap-4 p-5 md:grid-cols-2">
              {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
              <Field label="Başlık"><Input name="title" defaultValue={edit?.title} required /></Field>
              <Field label="URL"><Input name="slug" defaultValue={edit?.slug} /></Field>
              <Field label="İçerik" hint="Markdown: ## Başlık, **kalın**, - madde. HTML ile başlarsanız HTML olarak gösterilir." className="md:col-span-2">
                <Textarea name="content" defaultValue={edit?.content} className="min-h-[380px] font-mono text-[13px]" />
              </Field>
              <Field label="Footer grubu">
                <Select name="footerGroup" defaultValue={edit?.footerGroup ?? "Sözleşmeler"}>
                  <option>Sözleşmeler</option>
                  <option>Yardım</option>
                  <option>Kurumsal</option>
                </Select>
              </Field>
              <Field label="SEO açıklaması"><Input name="seoDescription" defaultValue={edit?.seoDescription ?? ""} /></Field>
              <Checkbox name="isPublished" defaultChecked={edit?.isPublished ?? true} label="Yayında" />
              <Checkbox name="showInFooter" defaultChecked={edit?.showInFooter ?? true} label="Footer'da göster" />
              <SubmitButton className="md:col-span-2 md:justify-self-start">Kaydet</SubmitButton>
            </ActionForm>
          </Card>
        ) : null}
      </div>
    </>
  );
}
