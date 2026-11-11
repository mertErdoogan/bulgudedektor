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
    // İade, siparişin ödendiği kuruluştan yapılır (sağlayıcı sonradan değişmiş olsa bile)
    if (order.paymentMeta.provider === "paytr") {
      const { getPaytrConfig, refund } = await import("@/lib/paytr");
      const cfg = await getPaytrConfig();
      if (!cfg || !order.paymentToken) throw new Error("PayTR bilgileri eksik olduğu için otomatik iade yapılamadı. PayTR panelinden iade edin.");
      await refund(cfg, order.paymentToken, amount);
      return "Kart iadesi PayTR üzerinden yapıldı.";
    }
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
    // Yorum daveti teslimattan 3 gün sonra zamanlanmış görevle (/api/cron) gönderilir.
    const link = `${process.env.APP_URL || ""}/siparis/${o.id}?k=${orderKey(o.id)}`;
    void mailStatus(o.email, o.number, to === "SHIPPED" && extra.tracking ? `Siparişin kargoya verildi: ${extra.carrier} · takip no ${extra.tracking}` : `Sipariş durumu: ${ORDER_STATUS_LABEL[to]}`, link);
    if (to === "SHIPPED" || to === "DELIVERED") {
      const { smsOrderEvent } = await import("@/lib/sms");
      void smsOrderEvent(to === "SHIPPED" ? "shipped" : "delivered", { phone: o.phone, number: o.number, link, carrier: extra.carrier, tracking: extra.tracking });
    }
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
    const to = str(fd.get("to"));
    if (!ids.length) return fail("Sipariş seçin.");
    // Atama da toplu işlem menüsünden yapılır
    if (to === "ASSIGN_ME" || to.startsWith("ASSIGN:") || to === "UNASSIGN") {
      const userId = to === "ASSIGN_ME" ? staff.id : to === "UNASSIGN" ? null : to.slice(7);
      await db.update(orders).set({ assigneeId: userId }).where(inArray(orders.id, ids));
      await audit(staff.id, "update", "order", null, `${ids.length} sipariş ${userId ? "atandı" : "atamadan çıkarıldı"}`);
      if (userId && userId !== staff.id) {
        const { notifyStaff } = await import("@/lib/notify");
        await notifyStaff({ userId, kind: "assigned", title: `${staff.name} sana ${ids.length} sipariş atadı`, href: "/admin/isler" });
      }
      revalidatePath("/admin", "layout");
      return ok(userId ? `${ids.length} sipariş atandı.` : "Atamalar kaldırıldı.");
    }
    if (!["PREPARING", "SHIPPED", "DELIVERED"].includes(to)) return fail("Geçersiz işlem.");
    const carrier = strOrNull(fd.get("carrier"));
    let done = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await transition(id, to as Status, staff, to === "SHIPPED" ? { carrier, tracking: strOrNull(fd.get(`tracking_${id}`)) } : {});
        done++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "hata");
      }
    }
    revalidatePath("/admin", "layout");
    const skipped = errors.length ? ` ${errors.length} sipariş atlandı: ${[...new Set(errors)].slice(0, 2).join(" · ")}` : "";
    return done ? ok(`${done} sipariş güncellendi.${skipped}`) : fail(errors[0] ?? "Güncellenemedi.");
  });
}

/**
 * Kargo firmasının günlük gönderi listesinden takip numaralarını toplu girer ve siparişleri "Kargoya verildi" yapar.
 * Satır biçimi: sipariş no ; takip no [; kargo firması]   (ayırıcı ; , veya sekme; başlık satırı olabilir)
 */
export async function importTracking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const file = fd.get("file");
    const text = file instanceof File && file.size ? await file.text() : str(fd.get("text"));
    if (!text.trim()) return fail("CSV dosyası seçin ya da satırları yapıştırın.");
    const defCarrier = strOrNull(fd.get("carrier"));
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((l) => l.split(/[;,\t]/).map((x) => x.trim().replace(/^"|"$/g, "")))
      .filter((c) => c.length >= 2 && /\d/.test(c[0]) && c[1]);
    if (!lines.length) return fail("Okunabilir satır yok. Biçim: sipariş no ; takip no ; kargo firması");
    let done = 0;
    const errors: string[] = [];
    for (const [no, tracking, carrier] of lines) {
      const num = Number(no.replace(/\D/g, ""));
      const o = num ? await db.query.orders.findFirst({ where: eq(orders.number, num), columns: { id: true } }) : null;
      if (!o) {
        errors.push(`${no}: sipariş bulunamadı`);
        continue;
      }
      try {
        await transition(o.id, "SHIPPED", staff, { carrier: carrier || defCarrier, tracking });
        done++;
      } catch (e) {
        errors.push(`${no}: ${e instanceof Error ? e.message : "hata"}`);
      }
    }
    revalidatePath("/admin", "layout");
    const msg = `${done} sipariş kargoya verildi.`;
    if (!done) return fail(errors.slice(0, 4).join(" · ") || "Hiçbir sipariş güncellenmedi.");
    return ok(errors.length ? `${msg} Atlananlar: ${errors.slice(0, 4).join(" · ")}${errors.length > 4 ? ` (+${errors.length - 4})` : ""}` : msg);
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
          channel: "MANUAL",
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

/** e-Arşiv/e-Fatura PDF'ini siparişe ekler; müşteri sipariş sayfasından indirir ve e-postayla bilgilendirilir. */
export async function saveInvoice(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("orders.manage");
    const id = str(fd.get("orderId"));
    const o = await db.query.orders.findFirst({ where: eq(orders.id, id) });
    if (!o) return fail("Sipariş bulunamadı.");
    const invoiceNo = strOrNull(fd.get("invoiceNo"));
    const link = strOrNull(fd.get("invoiceLink"));
    const file = fd.get("file");
    let url = o.invoiceUrl;
    if (file instanceof File && file.size) {
      if (file.type !== "application/pdf") return fail("Fatura PDF olmalı.");
      const { saveUpload } = await import("@/lib/storage");
      url = (await saveUpload(file)).url;
    } else if (link) {
      if (!/^https:\/\//.test(link)) return fail("Bağlantı https:// ile başlamalı.");
      url = link;
    }
    if (!url) return fail("PDF yükleyin ya da e-fatura portalındaki bağlantıyı yapıştırın.");
    const first = !o.invoiceUrl;
    await db.update(orders).set({ invoiceNo, invoiceUrl: url, invoicedAt: o.invoicedAt ?? new Date() }).where(eq(orders.id, id));
    await addOrderEvent(db, id, "invoice", `Fatura düzenlendi${invoiceNo ? ` (${invoiceNo})` : ""}.`, staff.id, true);
    await audit(staff.id, "update", "order", id, `Fatura ${first ? "eklendi" : "güncellendi"}`);
    if (first || fd.get("notify") === "on") {
      const { mailInvoice } = await import("@/lib/mail");
      void mailInvoice({ id, number: o.number, email: o.email, invoiceNo, invoiceUrl: url });
    }
    revalidatePath(`/admin/siparisler/${id}`);
    return ok(first ? "Fatura eklendi, müşteriye e-posta gönderildi." : "Fatura güncellendi.");
  });
}
