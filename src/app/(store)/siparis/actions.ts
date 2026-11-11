"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { getCustomer } from "@/lib/auth";
import { allowIp } from "@/lib/guard";
import { sendMail, wrap } from "@/lib/mail";
import { addOrderEvent } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { saveUpload } from "@/lib/storage";
import { orderKey } from "@/lib/store";
import { formatTL, orderNo, str } from "@/lib/utils";

/** Havale/EFT ile ödeyen müşterinin "ödemeyi yaptım" bildirimi (isteğe bağlı dekontla). Siparişi otomatik onaylamaz. */
export async function notifyTransfer(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const id = str(fd.get("orderId"));
    const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    const me = await getCustomer();
    if (!o || (str(fd.get("k")) !== orderKey(o.id) && (!me || me.id !== o.customerId))) return fail("Sipariş bulunamadı.");
    if (o.paymentMethod !== "TRANSFER" || o.paymentStatus !== "PENDING") return fail("Bu sipariş için ödeme bildirimi gerekmiyor.");
    if (!(await allowIp("transfer-notice", 5, 60 * 60 * 1000))) return fail("Çok fazla deneme. Biraz sonra tekrar dene.");
    const sender = str(fd.get("sender")).slice(0, 120);
    if (sender.length < 3) return fail("Gönderen ad soyadı yaz.");
    const file = fd.get("receipt");
    let receiptUrl: string | null = null;
    if (file instanceof File && file.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type)) return fail("Dekont JPG, PNG veya PDF olmalı.");
      if (file.size > 5 * 1024 * 1024) return fail("Dekont 5 MB'tan büyük olamaz.");
      receiptUrl = (await saveUpload(file, { private: true })).url;
    }
    const note = str(fd.get("note")).slice(0, 300);
    await db
      .update(orders)
      .set({ paymentMeta: { ...(o.paymentMeta ?? {}), transferNotice: { sender, note, receiptUrl, at: new Date().toISOString() } } })
      .where(eq(orders.id, o.id));
    await addOrderEvent(db, o.id, "transfer_notice", "Ödeme bildirimin alındı. Hesabımıza geçtiğini kontrol edip siparişini onaylayacağız.");
    await addOrderEvent(db, o.id, "transfer_notice", `Müşteri havale bildirdi · Gönderen: ${sender}${note ? ` · Not: ${note}` : ""}${receiptUrl ? ` · Dekont: ${receiptUrl}` : ""}`, null, false);
    const { notifyStaff } = await import("@/lib/notify");
    await notifyStaff({ perm: "orders.manage", kind: "transfer", title: `Havale bildirimi ${orderNo(o.number)} · ${formatTL(o.total)}`, body: `Gönderen: ${sender}${receiptUrl ? " · dekont yüklendi" : ""}`, href: `/admin/siparisler/${o.id}` });
    const s = await getSettings();
    if (s.integrations.notifyEmail)
      void sendMail(
        s.integrations.notifyEmail,
        `Havale bildirimi · ${orderNo(o.number)} · ${formatTL(o.total)}`,
        wrap(`<p><b>${orderNo(o.number)}</b> için müşteri ödemeyi yaptığını bildirdi.</p><p>Gönderen: ${sender.replace(/</g, "&lt;")}<br>Tutar: ${formatTL(o.total)}</p><p><a href="${process.env.APP_URL || ""}/admin/siparisler/${o.id}">Siparişi aç ve hesabı kontrol et</a></p>`, s.store.name),
      );
    revalidatePath(`/siparis/${o.id}`);
    return ok("Bildirimin alındı. Ödemeyi kontrol edip siparişini onaylayacağız.");
  });
}
