"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, customers, messages, newsletterSubscribers, orderItems, orders, productQuestions, products, reviews, stockAlerts } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { getCustomer } from "@/lib/auth";
import { quoteCart, type CartInput } from "@/lib/pricing";
import { normalizePhone, str, strOrNull } from "@/lib/utils";
import { allow, verifyHuman } from "@/lib/guard";

const rateLimit = (key: string, max = 5, windowMs = 10 * 60 * 1000) => allow(key, max, windowMs);

export async function getCartQuote(items: CartInput, coupon?: string | null, paymentMethod?: "CARD" | "TRANSFER", deliveryMethod?: "CARGO" | "PICKUP") {
  const c = await getCustomer();
  return quoteCart(items, { couponCode: coupon, paymentMethod, deliveryMethod, customerId: c?.id });
}

export async function askQuestion(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    if (!(await verifyHuman(fd))) return fail("Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.");
    if (fd.get("website")) return ok("Teşekkürler."); // bal tuzağı
    const productId = str(fd.get("productId"));
    const name = str(fd.get("name"));
    const contact = str(fd.get("contact"));
    const question = str(fd.get("question"));
    if (!name || !contact || question.length < 5) return fail("Ad, iletişim ve soru alanlarını doldurun.");
    if (!(await rateLimit(`q:${contact}`))) return fail("Çok fazla deneme. Biraz sonra tekrar deneyin.");
    const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!p) return fail("Ürün bulunamadı.");
    await db.insert(productQuestions).values({ productId, name, contact, question });
    const [c] = await db.insert(conversations).values({ contactName: name, contact, subject: `Ürün sorusu: ${p.name}`, channel: "WEB", productId }).returning();
    await db.insert(messages).values({ conversationId: c.id, body: question });
    return ok("Sorun alındı. Uzmanımız en kısa sürede yanıtlayacak.");
  });
}

export async function writeReview(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    if (!(await verifyHuman(fd))) return fail("Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.");
    const customer = await getCustomer();
    if (!customer) return fail("Yorum yazmak için giriş yapın.");
    const productId = str(fd.get("productId"));
    const rating = Math.max(1, Math.min(5, Number(fd.get("rating")) || 0));
    const body = str(fd.get("body"));
    if (!rating || body.length < 10) return fail("Puan verin ve en az 10 karakterlik yorum yazın.");
    const bought = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.customerId, customer.id), eq(orderItems.productId, productId), inArray(orders.status, ["DELIVERED", "SHIPPED"])))
      .limit(1);
    const parts = customer.name.split(" ");
    await db.insert(reviews).values({ productId, customerId: customer.id, name: `${parts[0]} ${parts[1]?.[0] ?? ""}.`.trim(), rating, body, isVerified: bought.length > 0 });
    return ok("Yorumun alındı, onaylandıktan sonra yayınlanacak. Teşekkürler!");
  });
}

export async function stockAlert(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const contact = str(fd.get("contact"));
    if (contact.length < 6) return fail("E-posta veya telefon girin.");
    await db.insert(stockAlerts).values({ productId: str(fd.get("productId")), contact });
    return ok("Stoğa girince sana haber vereceğiz.");
  });
}

export async function contactForm(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    if (!(await verifyHuman(fd))) return fail("Robot doğrulaması başarısız, sayfayı yenileyip tekrar dene.");
    if (fd.get("website")) return ok("Teşekkürler.");
    const name = str(fd.get("name"));
    const contactRaw = str(fd.get("contact"));
    const subject = str(fd.get("subject")) || "İletişim formu";
    const body = str(fd.get("message"));
    if (!name || !contactRaw || body.length < 5) return fail("Tüm alanları doldurun.");
    if (!fd.get("kvkk")) return fail("Aydınlatma metnini onaylayın.");
    if (!(await rateLimit(`c:${contactRaw}`, 3))) return fail("Çok fazla deneme. Biraz sonra tekrar deneyin.");
    const contact = contactRaw.includes("@") ? contactRaw.toLowerCase() : normalizePhone(contactRaw);
    const cust = await db.query.customers.findFirst({ where: contact.includes("@") ? eq(customers.email, contact) : eq(customers.phone, contact) });
    const [c] = await db.insert(conversations).values({ contactName: name, contact, subject, channel: "WEB", customerId: cust?.id ?? null }).returning();
    await db.insert(messages).values({ conversationId: c.id, body });
    return ok("Mesajın alındı. Çalışma saatlerinde en geç birkaç saat içinde dönüyoruz.");
  });
}

export async function subscribe(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const email = str(fd.get("email")).toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta girin.");
    await db.insert(newsletterSubscribers).values({ email }).onConflictDoUpdate({ target: newsletterSubscribers.email, set: { isActive: true } });
    return ok("Kaydın alındı.");
  });
}

export async function lookupCustomerHint() {
  const c = await getCustomer();
  return c ? { name: c.name, email: c.email, phone: c.phone } : null;
}

export async function noop(): Promise<ActionResult> {
  return ok(strOrNull(null) ?? undefined);
}
