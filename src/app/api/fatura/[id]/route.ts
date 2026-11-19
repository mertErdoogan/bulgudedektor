import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getCustomer, getStaff } from "@/lib/auth";
import { freshInvoicePdf } from "@/lib/einvoice";
import { orderKey } from "@/lib/store";

export const dynamic = "force-dynamic";

/** "Faturam" bağlantısı: erişim kontrolünden sonra entegratördeki güncel PDF adresine yönlendirir */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = new URL(req.url).searchParams.get("k") ?? "";
  const o = await db.query.orders.findFirst({ where: eq(orders.id, id), columns: { id: true, customerId: true } });
  if (!o) return new NextResponse("Bulunamadı", { status: 404 });
  const want = Buffer.from(orderKey(o.id));
  const keyOk = k.length === want.length && timingSafeEqual(Buffer.from(k), want);
  let allowed = keyOk;
  if (!allowed) {
    const c = await getCustomer();
    allowed = !!(c && o.customerId && c.id === o.customerId);
  }
  if (!allowed) allowed = !!(await getStaff());
  if (!allowed) return new NextResponse("Bu faturayı görmek için sipariş bağlantısını kullan ya da giriş yap.", { status: 403 });
  const url = await freshInvoicePdf(o.id).catch(() => null);
  if (!url) return new NextResponse("Fatura henüz hazır değil. Biraz sonra tekrar dene.", { status: 404 });
  return NextResponse.redirect(url, 302);
}
