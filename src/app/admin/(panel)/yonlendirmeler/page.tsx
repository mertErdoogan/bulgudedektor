import { desc } from "drizzle-orm";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Card, CardHeader, Field, Input, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deleteRedirect, saveRedirect } from "./actions";

export const metadata = { title: "Yönlendirmeler (301)" };

export default async function RedirectsPage() {
  await requireStaff("cms.manage");
  const rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
  return (
    <>
      <PageHeader title="Yönlendirmeler (301)" description="Ürün, kategori, marka veya yazı adresi değişince eski adres otomatik buraya eklenir. Eski sitenden gelen adresleri de elle ekleyebilirsin; Google sıralaması korunur." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <Table>
            <thead><tr><Th>Eski adres</Th><Th>Yeni adres</Th><Th>Kullanım</Th><Th>Eklendi</Th><Th /></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-soft/60">
                  <Td className="font-mono text-[12px]">{r.fromPath}</Td>
                  <Td className="font-mono text-[12px]"><a className="text-link" href={r.toPath} target="_blank">{r.toPath}</a></Td>
                  <Td>{r.hits}</Td>
                  <Td className="text-mute">{formatDate(r.createdAt)}</Td>
                  <Td className="text-right"><DeleteButton run={deleteRedirect.bind(null, r.id)} confirmText="Yönlendirme silinsin mi?" /></Td>
                </tr>
              ))}
              {!rows.length ? <tr><Td colSpan={5} className="py-10 text-center text-mute">Henüz yönlendirme yok.</Td></tr> : null}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader title="Yeni yönlendirme" />
          <ActionForm action={saveRedirect} resetOnSuccess className="flex flex-col gap-4 p-5">
            <Field label="Eski adres" hint="ör. /urun/eski-model veya eski sitenin tam linki"><Input name="fromPath" required /></Field>
            <Field label="Yeni adres" hint="ör. /urun/yeni-model"><Input name="toPath" required /></Field>
            <SubmitButton>Ekle</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
