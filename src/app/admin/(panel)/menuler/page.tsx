import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { menuItems } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Card, CardHeader, Checkbox, Field, Input, Select } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { deleteMenuItem, saveMenuItem } from "../vitrin/actions";

export const metadata = { title: "Menüler" };
const LOC: Record<string, string> = { HEADER: "Üst menü (kategori çubuğu)", FOOTER_HELP: "Footer · Yardım", FOOTER_CORP: "Footer · Kurumsal" };

export default async function MenusPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireStaff("cms.manage");
  const sp = await searchParams;
  const rows = await db.select().from(menuItems).orderBy(asc(menuItems.location), asc(menuItems.sortOrder));
  const edit = sp.id ? rows.find((r) => r.id === sp.id) : undefined;
  return (
    <>
      <PageHeader title="Menüler" description="Sözleşme sayfaları footer'a otomatik eklenir; burada ek bağlantıları yönetirsin." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-5">
          {Object.entries(LOC).map(([loc, label]) => (
            <Card key={loc}>
              <CardHeader title={label} />
              <ul className="divide-y divide-line">
                {rows.filter((r) => r.location === loc).map((m) => (
                  <li key={m.id} className={`flex items-center gap-3 px-5 py-3 text-sm ${m.id === sp.id ? "bg-tint" : ""}`}>
                    <span className="w-6 text-mute">{m.sortOrder}</span>
                    <Link href={`/admin/menuler?id=${m.id}`} className="flex-1 font-semibold hover:text-link">{m.label} <span className="font-normal text-mute">{m.url}</span></Link>
                    {m.highlight ? <Badge tone="brand">Vurgulu</Badge> : null}
                    {!m.isActive ? <Badge>Kapalı</Badge> : null}
                    <DeleteButton run={deleteMenuItem.bind(null, m.id)} confirmText="Silinsin mi?" />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <Card className="self-start">
          <CardHeader title={edit ? "Bağlantıyı düzenle" : "Yeni bağlantı"} />
          <ActionForm action={saveMenuItem} key={edit?.id ?? "new"} className="flex flex-col gap-3 p-5">
            {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
            <Field label="Yer"><Select name="location" defaultValue={edit?.location ?? "HEADER"}>{Object.entries(LOC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="Etiket"><Input name="label" defaultValue={edit?.label} required /></Field>
            <Field label="Bağlantı" hint="/kategori/pointer, /kampanyalar, https://…"><Input name="url" defaultValue={edit?.url} required /></Field>
            <Field label="Sıra"><Input name="sortOrder" type="number" defaultValue={edit?.sortOrder ?? 0} /></Field>
            <Checkbox name="isActive" defaultChecked={edit?.isActive ?? true} label="Aktif" />
            <Checkbox name="highlight" defaultChecked={edit?.highlight} label="Vurgulu göster (ör. Kampanyalar)" />
            <SubmitButton>Kaydet</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
