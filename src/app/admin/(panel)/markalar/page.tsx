import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, products } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { SingleImageField } from "@/components/admin/single-image-field";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { deleteBrand, saveBrand } from "./actions";

export const metadata = { title: "Markalar" };

export default async function BrandsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireStaff("catalog.manage");
  const { id } = await searchParams;
  const rows = await db
    .select({ b: brands, n: sql<number>`(select count(*)::int from ${products} where ${products.brandId} = ${brands.id})` })
    .from(brands)
    .orderBy(asc(brands.sortOrder), asc(brands.name));
  const edit = id ? rows.find((r) => r.b.id === id)?.b : undefined;
  return (
    <>
      <PageHeader title="Markalar" description="Mağazada filtre ve marka sayfaları için kullanılır." actions={edit ? <Button variant="outline" asChild><Link href="/admin/markalar">+ Yeni marka</Link></Button> : null} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Marka</Th>
                <Th>Ürün</Th>
                <Th>Sıra</Th>
                <Th>Durum</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, n }) => (
                <tr key={b.id} className={b.id === id ? "bg-tint" : "hover:bg-soft/60"}>
                  <Td>
                    <Link href={`/admin/markalar?id=${b.id}`} className="font-bold hover:text-link">{b.name}</Link>
                    <span className="block text-xs text-mute">/marka/{b.slug}</span>
                  </Td>
                  <Td>
                    <Link href={`/admin/urunler?marka=${b.id}`} className="text-link">{n} ürün</Link>
                  </Td>
                  <Td>{b.sortOrder}</Td>
                  <Td>{b.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge>Pasif</Badge>}</Td>
                  <Td className="text-right">
                    <DeleteButton run={deleteBrand.bind(null, b.id)} confirmText={`${b.name} silinsin mi?`} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader title={edit ? `Düzenle: ${edit.name}` : "Yeni marka"} />
          <ActionForm action={saveBrand} key={edit?.id ?? "new"} className="flex flex-col gap-4 p-5">
            {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
            <Field label="Marka adı *">
              <Input name="name" defaultValue={edit?.name} required />
            </Field>
            <Field label="URL" hint="Boşsa addan oluşur">
              <Input name="slug" defaultValue={edit?.slug} />
            </Field>
            <Field label="Logo">
              <SingleImageField name="logoUrl" defaultValue={edit?.logoUrl} />
            </Field>
            <Field label="Açıklama">
              <Textarea name="description" defaultValue={edit?.description ?? ""} />
            </Field>
            <Field label="Sıra">
              <Input name="sortOrder" type="number" defaultValue={edit?.sortOrder ?? 0} />
            </Field>
            <Checkbox name="isActive" defaultChecked={edit?.isActive ?? true} label="Aktif (mağazada görünür)" />
            <SubmitButton>{edit ? "Kaydet" : "Marka ekle"}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
