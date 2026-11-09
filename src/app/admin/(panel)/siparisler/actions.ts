"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers, orderItems, orders, products, serialNumbers } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff, type StaffSession } from "@/lib/auth";
import { refundPayment } from "@/lib/iyzico";
import { ORDER_FLOW, addOrderEvent, adjustStock, restockOrder } from "@/lib/orders";
import { can } from "@/lib/permissions";
import { quoteCart } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUS_LABEL, normalizePhone, orderNo, str, strOrNull, toNum } from "@/lib/utils";

type Status = (typeof orders.$inferSelect)["status"];

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
}

async function doRefund(order: typeof orders.$inferSelect, amount: number, staff: StaffSession) {
  if (!can(staff.permissions, "orders.refund")) throw new Error("Ödemesi alınmış siparişi iptal/iade etme yetkin yok.");
  if (order.paymentMethod === "CARD" && order.paymentMeta && order.paymentMeta.raw !== "simulated") {
    await refundPayment(order.paymentMeta, amount, await clientIp());
    return "Kart iadesi iyzico üzerinden yapıldı.";
  }
  if (order.paymentMethod === "CARD" && order.paymentMeta?.raw === "simulated") return "Simülasyon ödemesi: iade kaydı düşüldü.";
  return "Havale ile ödendiği için iade tutarını müşteriye EFT ile gönderin.";
}

async function transition(orderId: string, to: Status, staff: StaffSession, extra: { carrier?: string | null; tracking?: string | null; note?: string | null; refundAmount?: number } = {}) {
  const o = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: { with: { serials: true, product: true } } } });
  if (!o) throw new Error("Sipariş bulunamadı.");
  if (o.status === to) throw new Error("Sipariş zaten bu durumda.");
  if (!ORDER_FLOW[o.status]?.includes(to)) throw new Error(`"${ORDER_STATUS_LABEL[o.status]}" durumundan "${ORDER_STATUS_LABEL[to]}" durumuna geçilemez.`);

  let info = "";
  if (to === "SHIPPED") {
    if (o.deliveryMethod === "CARGO" && (!extra.carrier || !extra.tracking)) throw new Error("Kargo firması ve takip numarası girin.");
    const missing = o.items.filter((i) => i.product?.trackSerial && i.serials.length < i.quantity);
    if (missing.length) throw new Error(`Seri numarası atanmamış ürün var: ${missing.map((m) => m.name).join(", ")}`);
  }
  if ((to === "CANCELLED" || to === "REFUNDED") && o.paymentStatus === "PAID") {
    info = await doRefund(o, extra.refundAmount ?? o.total, staff);
  }

  await db.transaction(async (tx) => {
    const patch: Partial<typeof orders.$inferInsert> = { status: to };
    if (to === "PAID") patch.paymentStatus = "PAID";
    if (to === "SHIPPED") {
      patch.carrier = extra.carrier ?? null;
      patch.trackingNumber = extra.tracking ?? null;
      patch.shippedAt = new Date();
    }
    if (to === "DELIVERED") patch.deliveredAt = new Date();
    if (to === "CANCELLED" || to === "REFUNDED") {
      if (o.paymentStatus === "PAID") patch.paymentStatus = extra.refundAmount !== undefined && extra.refundAmount < o.total ? "PARTIALLY_REFUNDED" : "REFUNDED";
      await restockOrder(tx, o.id, to === "REFUNDED" ? "RETURN" : "CANCEL", staff.id);
    }
    await tx.update(orders).set(patch).where(eq(orders.id, o.id));
    const msg =
      to === "SHIPPED"
        ? o.deliveryMethod === "PICKUP"
          ? "Siparişin showroom'da teslim almaya hazır."
          : `Kargoya verildi: ${extra.carrier} · takip no ${extra.tracking}`
        : to === "PAID"
          ? "Ödeme onaylandı."
          : to === "PREPARING"
            ? "Siparişin hazırlanıyor."
            : to === "DELIVERED"
              ? "Teslim edildi."
              : to === "CANCELLED"
                ? "Sipariş iptal edildi."
                : "İade tamamlandı.";
    await addOrderEvent(tx, o.id, "status", msg + (extra.note ? ` (${extra.note})` : ""), staff.id);
    if (info) await addOrderEvent(tx, o.id, "refund", info, staff.id, false);
  });
  await audit(staff.id, "status", "order", o.id, `${orderNo(o.number)} → ${ORDER_STATUS_LABEL[to]}`);
  if (["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED", "PAID"].includes(to)) {
    const { mailStatus } = await import("@/lib/mail");
    const { orderKey } = await import("@/lib/store");
    if (to === "DELIVERED") {
      const { mailReviewRequest } = await import("@/lib/mail");
      void mailReviewRequest(o.id);
    } else void mailStatus(o.email, o.number, to === "SHIPPED" && extra.tracking ? `Siparişin kargoya verildi: ${extra.carrier} · takip no ${extra.tracking}` : `Sipariş durumu: ${ORDER_STATUS_LABEL[to]}`, `${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`);
  }
  return info;
}

export async function changeStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const to = str(fd.get("to")) as Status;
    const info = await transition(str(fd.get("orderId")), to, staff, {
      carrier: strOrNull(fd.get("carrier")),
      tracking: strOrNull(fd.get("tracking")),
      note: strOrNull(fd.get("note")),
      refundAmount: fd.get("refundAmount") ? toNum(fd.get("refundAmount")) : undefined,
    });
    revalidatePath("/admin", "layout");
    return ok(`Durum güncellendi: ${ORDER_STATUS_LABEL[to]}.${info ? " " + info : ""}`);
  });
}

export async function bulkStatus(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const ids = fd.getAll("ids").map(String);
    const to = str(fd.get("to")) as Status;
    if (!ids.length) return fail("Sipariş seçin.");
    if (!["PREPARING", "DELIVERED"].includes(to)) return fail("Toplu işlemde sadece 'Hazırlanıyor' ve 'Teslim edildi' kullanılabilir.");
    let done = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await transition(id, to, staff);
        done++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "hata");
      }
    }
    revalidatePath("/admin", "layout");
    return done ? ok(`${done} sipariş güncellendi.${errors.length ? ` ${errors.length} sipariş atlandı (uygun durumda değil).` : ""}`) : fail(errors[0] ?? "Güncellenemedi.");
  });
}

export async function assignSerials(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const itemId = str(fd.get("itemId"));
    const serialIds = fd.getAll("serialIds").map(String).filter(Boolean);
    const item = await db.query.orderItems.findFirst({ where: eq(orderItems.id, itemId), with: { product: true, serials: true, order: true } });
    if (!item || !item.productId) return fail("Kalem bulunamadı.");
    if (serialIds.length + item.serials.length > item.quantity) return fail(`Bu kalem için en fazla ${item.quantity} seri no atanabilir.`);
    const rows = await db.select().from(serialNumbers).where(and(inArray(serialNumbers.id, serialIds), eq(serialNumbers.productId, item.productId), eq(serialNumbers.status, "IN_STOCK")));
    if (rows.length !== serialIds.length) return fail("Seçilen seri numaralarından biri artık stokta değil.");
    const until = new Date();
    until.setMonth(until.getMonth() + (item.product?.warrantyMonths ?? 24));
    await db.update(serialNumbers).set({ status: "SOLD", orderItemId: item.id, soldAt: new Date(), warrantyUntil: until }).where(inArray(serialNumbers.id, serialIds));
    await addOrderEvent(db, item.orderId, "serial", `Seri no atandı: ${rows.map((r) => r.serial).join(", ")}`, staff.id, false);
    await audit(staff.id, "update", "order", item.orderId, `Seri no atandı (${rows.length})`);
    revalidatePath(`/admin/siparisler/${item.orderId}`);
    return ok("Seri numarası atandı. Garanti başlangıcı bugün.");
  });
}

export async function unassignSerial(serialId: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const s = await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.id, serialId), with: { orderItem: { with: { order: true } } } });
    if (!s?.orderItem) return fail("Atama bulunamadı.");
    if (["SHIPPED", "DELIVERED"].includes(s.orderItem.order.status)) return fail("Kargolanmış siparişte seri no değiştirilemez; iade sürecini kullanın.");
    await db.update(serialNumbers).set({ status: "IN_STOCK", orderItemId: null, soldAt: null, warrantyUntil: null }).where(eq(serialNumbers.id, serialId));
    await audit(staff.id, "update", "order", s.orderItem.orderId, `Seri no kaldırıldı: ${s.serial}`);
    revalidatePath(`/admin/siparisler/${s.orderItem.orderId}`);
    return ok("Seri no kaldırıldı.");
  });
}

export async function saveInternalNote(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const id = str(fd.get("orderId"));
    await db.update(orders).set({ internalNote: strOrNull(fd.get("internalNote")) }).where(eq(orders.id, id));
    await audit(staff.id, "update", "order", id, "İç not güncellendi");
    return ok("Not kaydedildi.");
  });
}

export async function addCustomerMessage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const id = str(fd.get("orderId"));
    const msg = str(fd.get("message"));
    if (!msg) return fail("Mesaj boş olamaz.");
    await addOrderEvent(db, id, "message", msg, staff.id, true);
    return ok("Müşterinin sipariş takip sayfasına eklendi.");
  });
}

export async function updateShippingAddress(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const id = str(fd.get("orderId"));
    const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!o) return fail("Sipariş yok.");
    if (["SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].includes(o.status)) return fail("Kargolanmış veya kapanmış siparişin adresi değiştirilemez.");
    const addr = { fullName: str(fd.get("fullName")), phone: str(fd.get("phone")), city: str(fd.get("city")), district: str(fd.get("district")), line: str(fd.get("line")), zip: str(fd.get("zip")) };
    if (!addr.fullName || !addr.city || !addr.line) return fail("Ad, il ve adres zorunlu.");
    await db.update(orders).set({ shippingAddress: addr }).where(eq(orders.id, id));
    await addOrderEvent(db, id, "address", "Teslimat adresi güncellendi.", staff.id, false);
    await audit(staff.id, "update", "order", id, "Adres güncellendi");
    return ok("Adres güncellendi.");
  });
}

/** Telefon / showroom satışı için panelden sipariş oluşturma */
export async function createManualOrder(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const items = JSON.parse(str(fd.get("items")) || "[]") as { productId: string; quantity: number }[];
    if (!items.length) return fail("En az bir ürün ekleyin.");
    const name = str(fd.get("name"));
    const phone = normalizePhone(str(fd.get("phone")));
    const email = str(fd.get("email")).toLowerCase() || `${phone.replace("+", "")}@telefon.siparis`;
    if (!name || !phone) return fail("Müşteri adı ve telefonu zorunlu.");
    const deliveryMethod = str(fd.get("deliveryMethod")) === "PICKUP" ? "PICKUP" : "CARGO";
    const paymentMethod = str(fd.get("paymentMethod")) === "CARD" ? "CARD" : "TRANSFER";
    const paid = fd.get("paid") === "on";
    const discountPct = Math.max(0, toNum(fd.get("discountPct"), 0));
    if (discountPct > staff.maxDiscountPct) return fail(`En fazla %${staff.maxDiscountPct} indirim yapabilirsin.`);

    const q = await quoteCart(items, { couponCode: strOrNull(fd.get("coupon")), deliveryMethod, paymentMethod });
    if (!q.lines.length) return fail(q.errors[0] ?? "Ürün stokta yok.");
    if (q.errors.length) return fail(q.errors.join(" "));
    const manualDiscount = Math.round(((q.subtotal - q.discountTotal) * discountPct) / 100);
    const total = Math.max(0, q.total - manualDiscount);

    const addr = { fullName: name, phone, city: str(fd.get("city")) || "—", district: str(fd.get("district")) || "—", line: str(fd.get("line")) || "Showroom teslim" };
    const orderId = await db.transaction(async (tx) => {
      let customer = await tx.query.customers.findFirst({ where: eq(customers.phone, phone) });
      if (!customer) [customer] = await tx.insert(customers).values({ name, phone, email: fd.get("email") ? email : null }).returning();
      const [o] = await tx
        .insert(orders)
        .values({
          customerId: customer.id,
          email,
          phone,
          status: paid ? "PAID" : "PENDING_PAYMENT",
          paymentStatus: paid ? "PAID" : "PENDING",
          paymentMethod,
          subtotal: q.subtotal,
          discountTotal: q.discountTotal + manualDiscount,
          shippingTotal: q.shippingTotal,
          total,
          couponCode: q.campaign?.code ?? null,
          campaignId: q.campaign?.id ?? null,
          deliveryMethod,
          shippingAddress: addr,
          internalNote: `Panelden oluşturuldu (${staff.name})${discountPct ? ` · %${discountPct} satış indirimi` : ""}`,
          paymentMeta: paid ? { raw: "manual" } : null,
        })
        .returning();
      await tx.insert(orderItems).values(q.lines.map((l) => ({ orderId: o.id, productId: l.productId, name: l.name, sku: l.sku, imageUrl: l.imageUrl, unitPrice: l.unitPrice, unitCost: l.unitCost, quantity: l.quantity, total: l.total })));
      for (const l of q.lines) await adjustStock(tx, l.productId, -l.quantity, "SALE", staff.id, `Panel siparişi`);
      await addOrderEvent(tx, o.id, "created", "Sipariş oluşturuldu.", staff.id);
      return o.id;
    });
    await audit(staff.id, "create", "order", orderId, "Panelden sipariş oluşturuldu");
    revalidatePath("/admin", "layout");
    return ok("Sipariş oluşturuldu.", { redirect: `/admin/siparisler/${orderId}` });
  });
}

export async function searchProductsForOrder(q: string) {
  await assertStaff("orders.manage");
  return db
    .select({ id: products.id, name: products.name, sku: products.sku, price: products.price, stock: products.stock })
    .from(products)
    .where(and(eq(products.status, "ACTIVE"), sql`(${products.name} ilike ${"%" + q + "%"} or ${products.sku} ilike ${"%" + q + "%"})`))
    .limit(8);
}

export async function getCarriers() {
  return (await getSettings()).shipping.carriers;
}
