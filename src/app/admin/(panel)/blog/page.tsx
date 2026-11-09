import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Badge, Button, Card, EmptyState, Table, Td, Th } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deletePost } from "./actions";

export const metadata = { title: "Blog ve rehberler" };

export default async function BlogAdmin() {
  await requireStaff("cms.manage");
  const rows = await db.select().from(posts).orderBy(desc(posts.updatedAt));
  const now = Date.now();
  return (
    <>
      <PageHeader
        title="Blog ve rehberler"
        description="Rehberler Google'da uzun kuyruklu aramaları ve AI cevaplarındaki alıntıları getirir. Her yazı tek bir soruya net cevap versin."
        actions={<Button asChild><Link href="/admin/blog/yeni">+ Yeni yazı</Link></Button>}
      />
      <Card>
        {rows.length ? (
          <Table>
            <thead>
              <tr><Th>Başlık</Th><Th>Kategori</Th><Th>Durum</Th><Th>Kısa cevap</Th><Th>Güncelleme</Th><Th /></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const words = (p.answer ?? "").split(/\s+/).filter(Boolean).length;
                const scheduled = p.status === "PUBLISHED" && p.publishedAt && p.publishedAt.getTime() > now;
                return (
                  <tr key={p.id} className="hover:bg-soft/60">
                    <Td>
                      <Link href={`/admin/blog/${p.id}`} className="font-bold hover:text-link">{p.title}</Link>
                      <span className="block text-xs text-mute">/blog/{p.slug}</span>
                    </Td>
                    <Td>{p.category}</Td>
                    <Td>{p.status === "PUBLISHED" ? (scheduled ? <Badge tone="warn">Zamanlandı</Badge> : <Badge tone="ok">Yayında</Badge>) : <Badge>Taslak</Badge>}</Td>
                    <Td>{words ? <Badge tone={words >= 40 && words <= 60 ? "ok" : "warn"}>{words} kelime</Badge> : <Badge tone="danger">Yok</Badge>}</Td>
                    <Td className="text-mute">{formatDate(p.updatedAt)}</Td>
                    <Td className="text-right whitespace-nowrap">
                      {p.status === "PUBLISHED" ? <a href={`/blog/${p.slug}`} target="_blank" className="mr-3 text-sm font-bold text-link">Gör</a> : null}
                      <DeleteButton run={deletePost.bind(null, p.id)} confirmText={`"${p.title}" silinsin mi?`} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Henüz yazı yok" description="İlk rehberini yaz: müşterilerin en çok sorduğu soruyla başla." action={<Button asChild><Link href="/admin/blog/yeni">Yazı ekle</Link></Button>} />
        )}
      </Card>
    </>
  );
}
