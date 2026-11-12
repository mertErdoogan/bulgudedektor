import { desc } from "drizzle-orm";
import { db } from "@/db";
import { notFoundLogs, redirects } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Card, CardHeader, Field, Input, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deleteRedirect, dismiss404, saveRedirect } from "./actions";

export const metadata = { title: "Yönlendirmeler (301)" };

export default async function RedirectsPage() {
  await requireStaff("cms.manage");
  const [rows, missing] = await Promise.all([
    db.select().from(redirects).orderBy(desc(redirects.createdAt)),
    db.select().from(notFoundLogs).orderBy(desc(notFoundLogs.hits), desc(notFoundLogs.lastAt)).limit(50),
  ]);
  return (
    <>
      <PageHeader title="Yönlendirmeler (301)" description="Ürün, kategori, marka veya yazı adresi değişince eski adres otomatik buraya eklenir. Eski sitenden gelen adresleri de elle ekleyebilirsin; Google sıralaması korunur." />
      {missing.length ? (
        <Card className="mb-5">
          <CardHeader title="Bulunamayan adresler (404)" description="Ziyaretçilerin ve Google'ın açmaya çalışıp bulamadığı adresler. Çok tıklananlara yeni adres yazıp yönlendir; önemsizleri listeden kaldır." />
          <Table>
            <thead><tr><Th>Adres</Th><Th>Deneme</Th><Th>Son</Th><Th>Nereden</Th><Th>Yönlendir</Th><Th /></tr></thead>
            <tbody>
              {missing.map((m) => (
                <tr key={m.id} className="hover:bg-soft/60">
                  <Td className="max-w-[280px] truncate font-mono text-[12px]" title={m.path}>{m.path}</Td>
                  <Td><b>{m.hits}</b></Td>
                  <Td className="whitespace-nowrap text-mute">{formatDate(m.lastAt)}</Td>
                  <Td className="max-w-[180px] truncate text-xs text-mute" title={m.referrer ?? ""}>{m.referrer ? m.referrer.replace(/^https?:\/\//, "") : "—"}</Td>
                  <Td>
                    <ActionForm action={saveRedirect} className="flex items-center gap-2">
                      <input type="hidden" name="fromPath" value={m.path} />
                      <Input name="toPath" required placeholder="/urun/yeni-adres" className="h-9 w-56 font-mono text-[12px]" aria-label={`${m.path} için yeni adres`} />
                      <SubmitButton size="sm">Kaydet</SubmitButton>
                    </ActionForm>
                  </Td>
                  <Td className="text-right"><DeleteButton run={dismiss404.bind(null, m.id)} confirmText="Bu adres listeden kaldırılsın mı?" /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
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
