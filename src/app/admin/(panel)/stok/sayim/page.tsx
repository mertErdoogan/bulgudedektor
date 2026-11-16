import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { PageHeader } from "@/components/admin/shell";
import { requireStaff } from "@/lib/auth";
import { CountForm } from "./count-form";

export const metadata = { title: "Seri no sayımı" };

export default async function CountPage() {
  await requireStaff("inventory.manage");
  const list = await db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).where(eq(products.trackSerial, true)).orderBy(asc(products.name));
  return (
    <>
      <PageHeader
        title="Seri no sayımı"
        description="Raftaki cihazların seri numaralarını barkod okuyucuyla art arda okut. Sistem 'stokta' görünen ama rafta olmayan cihazları ve rafta olup sistemde stokta görünmeyenleri listeler. Ayda bir yapılması önerilir."
        actions={<Link href="/admin/stok" className="text-sm font-bold text-link">← Stok</Link>}
      />
      <CountForm products={list} />
    </>
  );
}
