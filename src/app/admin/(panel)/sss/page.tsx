import Link from "next/link";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { categories, faqs, products } from "@/db/schema";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { deleteFaq, saveFaq } from "./actions";

export const metadata = { title: "SSS ve sözlük" };

export default async function FaqAdmin({ searchParams }: { searchParams: Promise<{ t?: string; id?: string; g?: string }> }) {
  await requireStaff("cms.manage");
  const sp = await searchParams;
  const kind = sp.t === "sozluk" ? "GLOSSARY" : "FAQ";
  const [rows, prods, cats] = await Promise.all([
    db.query.faqs.findMany({ where: eq(faqs.kind, kind), with: { product: { columns: { name: true } }, category: { columns: { name: true } } }, orderBy: [asc(faqs.group), asc(faqs.sortOrder), asc(faqs.question)] }),
    db.select({ id: products.id, name: products.name }).from(products).where(ne(products.status, "ARCHIVED")).orderBy(asc(products.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  const groups = [...new Set(rows.map((r) => r.group))];
  const list = sp.g ? rows.filter((r) => r.group === sp.g) : rows;
  const edit = sp.id ? rows.find((r) => r.id === sp.id) : undefined;
  const q = kind === "FAQ";
  const tab = q ? "sss" : "sozluk";
  return (
    <>
      <PageHeader
        title="SSS ve sözlük"
        description="Soru–cevaplar sitede görünür ve FAQPage / DefinedTerm şemasıyla işaretlenir. İlk cümle doğrudan cevap olsun; AI motorları en çok bu cümleyi alıntılar."
        actions={edit ? <Button variant="outline" asChild><Link href={`/admin/sss?t=${tab}`}>+ Yeni kayıt</Link></Button> : null}
      />
      <div className="mb-4 flex flex-wrap items-center gap-1">
        {[["sss", "Sık sorulan sorular"], ["sozluk", "Sözlük"]].map(([k, l]) => (
          <Link key={k} href={`/admin/sss?t=${k}`} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === k ? "bg-deep text-white" : "bg-white hover:bg-tint"}`}>{l}</Link>
        ))}
        <a href={q ? "/sss" : "/sozluk"} target="_blank" className="ml-auto text-sm font-bold text-link">Sitede gör ↗</a>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <Card>
          {q && groups.length > 1 ? (
            <div className="flex flex-wrap gap-1 border-b border-line p-3">
              <Link href={`/admin/sss?t=sss`} className={`rounded-full px-3 py-1 text-xs font-bold ${!sp.g ? "bg-deep text-white" : "bg-soft"}`}>Tümü ({rows.length})</Link>
              {groups.map((g) => <Link key={g} href={`/admin/sss?t=sss&g=${encodeURIComponent(g)}`} className={`rounded-full px-3 py-1 text-xs font-bold ${sp.g === g ? "bg-deep text-white" : "bg-soft"}`}>{g}</Link>)}
            </div>
          ) : null}
          <Table>
            <thead>
              <tr><Th>{q ? "Soru" : "Terim"}</Th>{q ? <Th>Nerede</Th> : null}<Th>Durum</Th><Th /></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={r.id === sp.id ? "bg-tint" : "hover:bg-soft/60"}>
                  <Td className="max-w-[420px]">
                    <Link href={`/admin/sss?t=${tab}&id=${r.id}`} className="font-bold hover:text-link">{r.question}</Link>
                    <span className="line-clamp-1 block text-xs text-mute">{r.answer}</span>
                  </Td>
                  {q ? <Td className="text-sm">{r.product ? <Badge tone="brand">Ürün: {r.product.name}</Badge> : r.category ? <Badge tone="gold">Kategori: {r.category.name}</Badge> : <span>{r.group}</span>}{r.showOnHome ? <Badge className="ml-1" tone="dark">Ana sayfa</Badge> : null}</Td> : null}
                  <Td>{r.isPublished ? <Badge tone="ok">Yayında</Badge> : <Badge>Gizli</Badge>}</Td>
                  <Td className="text-right"><DeleteButton run={deleteFaq.bind(null, r.id)} confirmText="Silinsin mi?" /></Td>
                </tr>
              ))}
              {!list.length ? <tr><Td colSpan={4} className="py-10 text-center text-mute">Kayıt yok.</Td></tr> : null}
            </tbody>
          </Table>
        </Card>
        <Card className="self-start">
          <CardHeader title={edit ? "Düzenle" : q ? "Yeni soru" : "Yeni terim"} />
          <ActionForm action={saveFaq} key={edit?.id ?? `new-${tab}`} className="flex flex-col gap-4 p-5">
            {edit ? <input type="hidden" name="id" value={edit.id} /> : null}
            <input type="hidden" name="kind" value={kind} />
            <Field label={q ? "Soru *" : "Terim *"} hint={q ? "Müşterinin gerçekte sorduğu gibi yaz: 'Dedektör kaç metreye iner?'" : undefined}>
              <Input name="question" defaultValue={edit?.question} required />
            </Field>
            <Field label="Cevap *" hint={q ? "İlk cümle doğrudan cevap (evet/hayır, sayı, model). Sonra 1–3 cümle açıklama." : "İlk cümle tanım: 'X, … demektir.'"}>
              <Textarea name="answer" defaultValue={edit?.answer} className="min-h-[140px]" required />
            </Field>
            {q ? (
              <>
                <Field label="Konu grubu" hint="SSS sayfasında başlık olarak görünür">
                  <Input name="group" list="faq-groups" defaultValue={edit?.group ?? sp.g ?? "Genel"} />
                  <datalist id="faq-groups">{[...new Set([...groups, "Cihaz seçimi", "Yasal durum", "Sipariş ve ödeme", "Kargo ve teslimat", "Garanti ve servis", "İade"])].map((g) => <option key={g} value={g} />)}</datalist>
                </Field>
                <Field label="Ürüne bağla" hint="Seçersen sadece o ürünün sayfasında görünür">
                  <Select name="productId" defaultValue={edit?.productId ?? ""}>
                    <option value="">— Genel —</option>
                    {prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                <Field label="veya kategoriye bağla">
                  <Select name="categoryId" defaultValue={edit?.categoryId ?? ""}>
                    <option value="">— Genel —</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Checkbox name="showOnHome" defaultChecked={edit?.showOnHome ?? false} label="Ana sayfada da göster (en fazla 6–8 öneriliyor)" />
              </>
            ) : <input type="hidden" name="group" value="Sözlük" />}
            <Field label="Sıra"><Input name="sortOrder" type="number" defaultValue={edit?.sortOrder ?? 0} /></Field>
            <Checkbox name="isPublished" defaultChecked={edit?.isPublished ?? true} label="Yayında" />
            <SubmitButton>{edit ? "Kaydet" : "Ekle"}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
