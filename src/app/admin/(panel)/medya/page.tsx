import { desc } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/shell";
import { Card, EmptyState } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { deleteMedia } from "../vitrin/actions";
import { MediaUpload } from "./upload";

export const metadata = { title: "Medya" };

export default async function MediaPage() {
  await requireStaff("cms.manage");
  const rows = await db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="Medya" description="Yüklenen tüm görseller. Bağlantıyı kopyalayıp banner, sayfa veya ürünlerde kullanabilirsin." />
      <MediaUpload />
      <Card className="mt-5 p-4">
        {rows.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {rows.map((m) => (
              <div key={m.id} className="rounded-xl border border-line p-2 text-xs">
                <div className="grid aspect-square place-items-center overflow-hidden rounded-lg bg-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {m.mime.startsWith("image/") ? <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-contain" /> : <span>PDF</span>}
                </div>
                <p className="mt-1.5 truncate font-semibold">{m.filename}</p>
                <p className="text-mute">{Math.round(m.size / 1024)} KB · {formatDate(m.createdAt)}</p>
                <input readOnly value={m.url} className="mt-1 w-full rounded border border-line px-1.5 py-1 font-mono text-[11px]" />
                <DeleteButton run={deleteMedia.bind(null, m.id)} confirmText="Dosya silinsin mi? Kullanıldığı yerlerde görünmez olur." />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Henüz dosya yok" />
        )}
      </Card>
    </>
  );
}
