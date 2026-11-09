import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { SingleImageField } from "@/components/admin/single-image-field";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { deleteCategory, saveCategory } from "../markalar/actions";

export const metadata = { title: "Kategoriler" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireStaff("catalog.manage");
  const { id } = await searchParams;
  const rows = await db
    .select({ c: categories, n: sql<number>`(select count(*)::int from ${products} where ${products.categoryId} = ${categories.id})` })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
  const edit = id ? rows.find((r) => r.c.id === id)?.c : undefined;
  const parentName = (pid: string | null) => rows.find((r) => r.c.id === pid)?.c.name;
  return (
    <>
      <PageHeader
        title="Kategoriler"
        description="Mağaza menüsü, ana sayfa kutuları ve katalog sayfaları buradan beslenir. Açıklama, kategori sayfasının üstünde görünür."
        actions={edit ? <Button variant="outline" asChild><Link href="/admin/kategoriler">+ Yeni kategori</Link></Button> : null}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Kategori</Th>
                <Th>Ürün</Th>
                <Th>Sıra</Th>
                <Th>Durum</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, n }) => (
                <tr key={c.id} className={c.id === id ? "bg-tint" : "hover:bg-soft/60"}>
                  <Td>
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="h-10 w-10 rounded-lg border border-line object-contain" />
                      ) : (
                        <span className="h-10 w-10 rounded-lg bg-soft" />
                      )}
                      <span>
                        <Link href={`/admin/kategoriler?id=${c.id}`} className="font-bold hover:text-link">
                          {c.parentId ? `${parentName(c.parentId)} › ` : ""}
                          {c.name}
                        </Link>
                        <span className="block text-xs text-mute">{c.shortText}</span>
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <Link href={`/admin/urunler?kategori=${c.id}`} className="text-link">{n} ürün</Link>
                  </Td>
                  <Td>{c.sortOrder}</Td>
                  <Td className="space-x-1">
                    {c.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge>Pasif</Badge>}
                    {c.showInMenu ? <Badge tone="brand">Menüde</Badge> : null}
                  </Td>
                  <Td className="text-right">
                    <DeleteButton run={deleteCategory.bind(null, c.id)} confirmText={`${c.name} silinsin mi?`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader title={edit ? `Düzenle: ${edit.name}` : "Yeni kategori"} />
          <ActionForm action={saveCategory} key={edit?.id ?? "new"} className="flex flex-col gap-4 p-5">
            {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
            <Field label="Kategori adı *">
              <Input name="name" defaultValue={edit?.name} required />
            </Field>
            <Field label="Kısa alt yazı" hint="Ana sayfa kutusunda görünür, ör. 'Tarla, bağ, harabe'">
              <Input name="shortText" defaultValue={edit?.shortText ?? ""} maxLength={40} />
            </Field>
            <Field label="Üst kategori">
              <Select name="parentId" defaultValue={edit?.parentId ?? ""}>
                <option value="">— Ana kategori —</option>
                {rows
                  .filter((r) => r.c.id !== edit?.id)
                  .map((r) => (
                    <option key={r.c.id} value={r.c.id}>
                      {r.c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Görsel">
              <SingleImageField name="imageUrl" defaultValue={edit?.imageUrl} />
            </Field>
            <Field label="Açıklama" hint="Kategori sayfasının başında 2–3 cümle: bu cihazlar neden burada?">
              <Textarea name="description" defaultValue={edit?.description ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="URL">
                <Input name="slug" defaultValue={edit?.slug} />
              </Field>
              <Field label="Sıra">
                <Input name="sortOrder" type="number" defaultValue={edit?.sortOrder ?? 0} />
              </Field>
            </div>
            <Field label="SEO başlığı">
              <Input name="seoTitle" defaultValue={edit?.seoTitle ?? ""} />
            </Field>
            <Field label="SEO açıklaması">
              <Textarea name="seoDescription" defaultValue={edit?.seoDescription ?? ""} className="min-h-[60px]" />
            </Field>
            <Field label="Kategori rehber metni (Markdown)" hint="Ürün listesinin altında görünür. ## alt başlıklar, listeler ve | tablo | kullanılabilir. 300–800 kelime, soru biçiminde başlıklar AI aramada öne çıkar.">
              <Textarea name="seoContent" defaultValue={edit?.seoContent ?? ""} className="min-h-[160px] font-mono text-[12px]" />
            </Field>
            <Checkbox name="isActive" defaultChecked={edit?.isActive ?? true} label="Aktif" />
            <Checkbox name="showInMenu" defaultChecked={edit?.showInMenu ?? true} label="Mağaza menüsünde ve ana sayfa kutularında göster" />
            <SubmitButton>{edit ? "Kaydet" : "Kategori ekle"}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
