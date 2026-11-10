"use server";

import bcrypt from "bcryptjs";
import { and, eq, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { addresses, customers, orderItems, orders, products, stockMovements } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { getCustomer } from "@/lib/auth";
import { initCheckoutForm, getIyzicoConfig, simulationAllowed } from "@/lib/iyzico";
import { addOrderEvent, failOrderPayment, notifyPlaced } from "@/lib/orders";
import { quoteCart, type CartInput } from "@/lib/pricing";
import { CUSTOMER_COOKIE, setSessionCookie, signToken } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { orderKey } from "@/lib/store";
import { normalizePhone, str, strOrNull } from "@/lib/utils";
import { validTckn } from "@/lib/tckn";

export async function placeOrder(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const s = await getSettings();
    const items = JSON.parse(str(fd.get("items")) || "[]") as CartInput;
    if (!items.length) return fail("Sepetin boş.");
    const email = str(fd.get("email")).toLowerCase();
    const phone = normalizePhone(str(fd.get("phone")));
    const fullName = str(fd.get("fullName"));
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta girin.");
    if (phone.replace(/\D/g, "").length < 12) return fail("Geçerli bir cep telefonu girin (05xx xxx xx xx).");
    if (fullName.split(" ").length < 2) return fail("Ad ve soyadı birlikte yazın.");
    const deliveryMethod = str(fd.get("deliveryMethod")) === "PICKUP" && s.shipping.pickupEnabled ? "PICKUP" : "CARGO";
    const paymentMethod = str(fd.get("paymentMethod")) === "TRANSFER" ? "TRANSFER" : "CARD";
    if (paymentMethod === "TRANSFER" && !s.payment.transferEnabled) return fail("Havale ile ödeme şu an kapalı.");
    if (paymentMethod === "CARD" && !s.payment.cardEnabled) return fail("Kartla ödeme şu an kapalı.");
    const address = {
      fullName,
      phone,
      city: str(fd.get("city")),
      district: str(fd.get("district")),
      line: str(fd.get("line")),
      zip: str(fd.get("zip")) || undefined,
    };
    if (deliveryMethod === "CARGO" && (!address.city || !address.district || address.line.length < 8)) return fail("Teslimat adresini eksiksiz yazın.");
    if (deliveryMethod === "PICKUP") Object.assign(address, { city: address.city || "Showroom", district: address.district || "—", line: address.line || "Showroom'dan teslim" });
    const invoiceType = str(fd.get("invoiceType")) === "CORPORATE" ? "CORPORATE" : "INDIVIDUAL";
    if (invoiceType === "CORPORATE" && (!str(fd.get("companyName")) || !str(fd.get("taxOffice")) || !/^\d{10,11}$/.test(str(fd.get("taxNumber"))))) return fail("Kurumsal fatura için unvan, vergi dairesi ve 10 haneli vergi no gerekli.");
    const tckn = str(fd.get("tckn")).replace(/\D/g, "");
    if (tckn && !validTckn(tckn)) return fail("TC kimlik numarası hatalı görünüyor. Boş bırakabilir ya da düzeltebilirsin.");
    if (!fd.get("terms")) return fail("Ön bilgilendirme formu ve mesafeli satış sözleşmesini onaylayın.");

    const me = await getCustomer();
    const q = await quoteCart(items, { couponCode: strOrNull(fd.get("coupon")), paymentMethod, deliveryMethod, customerId: me?.id });
    if (q.errors.length) return fail(q.errors.join(" ") + " Sepetini kontrol et.");
    if (!q.lines.length) return fail("Sepetteki ürünler stokta değil.");
    if (q.couponError) return fail(q.couponError);
    const installments = paymentMethod === "CARD" ? 1 : 1;
    const marketing = fd.get("marketing") === "on";
    const password = str(fd.get("password"));
    if (password && password.length < 8) return fail("Şifre en az 8 karakter olmalı.");

    const { orderId, customerId } = await db.transaction(async (tx) => {
      let cust = me ?? (await tx.query.customers.findFirst({ where: or(eq(customers.email, email), eq(customers.phone, phone)) }));
      if (!cust) {
        [cust] = await tx
          .insert(customers)
          .values({ name: fullName, email, phone, marketingConsent: marketing, consentAt: marketing ? new Date() : null, passwordHash: password ? await bcrypt.hash(password, 10) : null })
          .returning();
      } else if (marketing && !cust.marketingConsent) {
        await tx.update(customers).set({ marketingConsent: true, consentAt: new Date() }).where(eq(customers.id, cust.id));
      }
      if (cust.isBlocked) throw new Error("Bu hesapla sipariş verilemiyor. Lütfen bizimle iletişime geçin.");
      if (deliveryMethod === "CARGO" && fd.get("saveAddress") === "on") {
        const has = await tx.query.addresses.findFirst({ where: and(eq(addresses.customerId, cust.id), eq(addresses.line, address.line)) });
        if (!has) await tx.insert(addresses).values({ customerId: cust.id, ...address, title: "Ev", isDefault: true });
      }
      const [o] = await tx
        .insert(orders)
        .values({
          customerId: cust.id,
          email,
          phone,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          paymentMethod,
          installments,
          subtotal: q.subtotal,
          discountTotal: q.discountTotal,
          shippingTotal: q.shippingTotal,
          total: q.total,
          couponCode: q.campaign?.code ?? null,
          campaignId: q.campaign?.id ?? null,
          deliveryMethod,
          shippingAddress: address,
          invoiceType,
          companyName: strOrNull(fd.get("companyName")),
          taxOffice: strOrNull(fd.get("taxOffice")),
          taxNumber: strOrNull(fd.get("taxNumber")),
          customerNote: strOrNull(fd.get("note")),
        })
        .returning();
      await tx.insert(orderItems).values(q.lines.map((l) => ({ orderId: o.id, productId: l.productId, name: l.name, sku: l.sku, imageUrl: l.imageUrl, unitPrice: l.unitPrice, unitCost: l.unitCost, quantity: l.quantity, total: l.total })));
      for (const l of q.lines) {
        const res = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${l.quantity}` })
          .where(and(eq(products.id, l.productId), or(sql`${products.stock} >= ${l.quantity}`, eq(products.allowBackorder, true))))
          .returning({ id: products.id });
        if (!res.length) throw new Error(`${l.name} az önce tükendi. Sepetini güncelle.`);
        await tx.insert(stockMovements).values({ productId: l.productId, delta: -l.quantity, reason: "SALE", note: `Sipariş ${o.number}` });
      }
      await addOrderEvent(tx, o.id, "created", "Siparişin alındı.");
      return { orderId: o.id, customerId: cust.id };
    });

    if (!me && password) await setSessionCookie(CUSTOMER_COOKIE, await signToken({ sub: customerId, kind: "customer" }, 30), 30);
    const key = orderKey(orderId);
    const base = process.env.APP_URL || "http://localhost:3000";

    if (paymentMethod === "TRANSFER") {
      void notifyPlaced(orderId);
      return ok("Siparişin alındı.", { redirect: `/siparis/${orderId}?k=${key}&yeni=1` });
    }

    const cfg = await getIyzicoConfig();
    if (!cfg) {
      if (simulationAllowed()) return ok(undefined, { redirect: `/odeme/simulasyon?o=${orderId}&k=${key}` });
      await failOrderPayment(orderId, "Ödeme altyapısı ayarlanmamış");
      return fail("Kartla ödeme şu an kullanılamıyor. Havale seçebilir veya bize WhatsApp'tan yazabilirsin.");
    }
    const h = await headers();
    try {
      const form = await initCheckoutForm({
        conversationId: orderId,
        basketId: orderId,
        price: q.subtotal + q.shippingTotal,
        paidPrice: q.total,
        callbackUrl: `${base}/api/odeme/iyzico?o=${orderId}`,
        buyer: { id: customerId, name: fullName, email, phone, identityNumber: tckn || undefined, city: address.city, address: `${address.line} ${address.district}/${address.city}`, ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || "85.34.78.112" },
        // iyzico: kalem toplamı "price" olmalı; indirim "paidPrice"ta yansır, kargo ayrı kalem.
        items: [
          ...q.lines.map((l) => ({ id: l.productId, name: l.name, category: "Dedektör", price: l.total })),
          ...(q.shippingTotal > 0 ? [{ id: "kargo", name: "Kargo", category: "Kargo", price: q.shippingTotal }] : []),
        ],
        // Kayıtlı kartlar yalnızca oturum açmış hesabın kendi siparişinde gösterilir (misafir siparişte asla)
        cardUserKey: me && me.id === customerId ? me.cardUserKey : null,
        enabledInstallments: Array.from({ length: Math.max(1, s.payment.maxInstallment) }, (_, i) => i + 1).filter((n) => [1, 2, 3, 6, 9, 12].includes(n)),
      });
      await db.update(orders).set({ paymentToken: form.token }).where(eq(orders.id, orderId));
      return ok(undefined, { redirect: form.paymentPageUrl });
    } catch (e) {
      await failOrderPayment(orderId, e instanceof Error ? e.message : "iyzico hatası");
      return fail(e instanceof Error ? e.message : "Ödeme başlatılamadı, lütfen tekrar dene.");
    }
  });
}
