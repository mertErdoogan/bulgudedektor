"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders, returnRequests } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { addOrderEvent } from "@/lib/orders";
import { str, strOrNull, toNum } from "@/lib/utils";
import { unitGroups } from "@/lib/returns";
import { changeStatus, refundReturnItems } from "../siparisler/actions";

export async function updateReturn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const id = str(fd.get("id"));
    const to = str(fd.get("to")) as "APPROVED" | "RECEIVED" | "REFUNDED" | "REJECTED";
    const r = await db.query.returnRequests.findFirst({ where: eq(returnRequests.id, id), with: { order: { with: { items: { with: { serials: true } }, returns: true } } } });
    if (!r) return fail("İade talebi bulunamadı.");
    const resolution = strOrNull(fd.get("resolution"));
    if (to === "REJECTED" && !resolution) return fail("Reddetme sebebini yazın; müşteriye gösterilir.");
    if (to === "REFUNDED") {
      await assertStaff("orders.refund");
      const refundedBefore = r.order.returns.filter((x) => x.id !== r.id && x.status === "REFUNDED").reduce((n, x) => n + (x.refundAmount ?? 0), 0);
      const left = Math.round((r.order.total - refundedBefore) * 100) / 100;
      const amount = toNum(fd.get("refundAmount"), left);
      if (amount <= 0 || amount > left) return fail(`İade tutarı geçersiz. Bu siparişte en fazla ${left} TL iade edilebilir.`);
      if (r.items.length) {
        // Ürün bazlı iade: yalnızca seçilen adetler. Bu talepten sonra iade edilmemiş adet kalmıyorsa sipariş kapanır.
        const afterRefund = r.order.returns.map((x) => (x.id === r.id ? { ...x, status: "REFUNDED" as const } : x)).filter((x) => x.status === "REFUNDED");
        const closes = !unitGroups(r.order.items, afterRefund).some((g) => g.units.some((u) => !u.taken));
        try {
          await refundReturnItems(r.orderId, amount, r.items, closes);
        } catch (e) {
          return fail(e instanceof Error ? e.message : "İade yapılamadı.");
        }
      } else if (!["REFUNDED", "CANCELLED"].includes(r.order.status)) {
        const f = new FormData();
        f.set("orderId", r.orderId);
        f.set("to", ["SHIPPED", "DELIVERED", "PAID", "PREPARING"].includes(r.order.status) ? "REFUNDED" : "CANCELLED");
        f.set("refundAmount", String(amount));
        f.set("note", "İade talebi");
        const res = await changeStatus(null, f);
        if (!res.ok) return res;
      }
      await db.update(returnRequests).set({ status: "REFUNDED", refundAmount: amount, resolution }).where(eq(returnRequests.id, id));
    } else {
      const code = to === "APPROVED" ? r.returnCode ?? `IADE-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : r.returnCode;
      await db.update(returnRequests).set({ status: to, resolution, returnCode: code }).where(eq(returnRequests.id, id));
      const msg =
        to === "APPROVED"
          ? `İade talebin onaylandı. Ücretsiz kargo kodun: ${code}. Ürünü kutusu ve aksesuarlarıyla gönder.`
          : to === "RECEIVED"
            ? "İade ettiğin ürün bize ulaştı, kontrol ediliyor."
            : `İade talebin reddedildi: ${resolution}`;
      await addOrderEvent(db, r.orderId, "return", msg, staff.id, true);
    }
    await audit(staff.id, "status", "return", id, `İade → ${to}`);
    revalidatePath("/admin", "layout");
    const DONE: Record<string, string> = { APPROVED: "İade onaylandı; müşteriye kargo kodu gönderildi.", RECEIVED: "Ürünün bize ulaştığı kaydedildi.", REFUNDED: "Para iadesi yapıldı.", REJECTED: "İade talebi reddedildi; müşteriye sebep gösterildi." };
    return ok(DONE[to] ?? "İade talebi güncellendi.");
  });
}

export async function createReturnForOrder(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const orderId = str(fd.get("orderId"));
    const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!o) return fail("Sipariş bulunamadı.");
    await db.insert(returnRequests).values({ orderId, customerId: o.customerId, reason: str(fd.get("reason")) || "Panelden açıldı", details: strOrNull(fd.get("details")) });
    await audit(staff.id, "create", "return", orderId, "İade talebi açıldı");
    return ok("İade talebi açıldı.");
  });
}
