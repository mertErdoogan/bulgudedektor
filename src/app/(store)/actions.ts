"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, customers, messages, newsletterSubscribers, orderItems, orders, productQuestions, products, reviews, stockAlerts } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { getCustomer } from "@/lib/auth";
import { quoteCart, type CartInput, type Quote } from "@/lib/pricing";
import { getLocale } from "@/lib/i18n/server";
import { localize } from "@/lib/i18n/content";
import { normalizePhone, str, strOrNull } from "@/lib/utils";
import { allow, allowIp, verifyHuman } from "@/lib/guard";

const rateLimit = (key: string, max = 5, windowMs = 10 * 60 * 1000) => allow(key, max, windowMs);

export async function getCartQuote(items: CartInput, coupon?: string | null, paymentMethod?: "CARD" | "TRANSFER", deliveryMethod?: "CARGO" | "PICKUP") {
  const c = await getCustomer();
  const q = await quoteCart(items, { couponCode: coupon, paymentMethod, deliveryMethod, customerId: c?.id });
  return (await getLocale()) === "en" ? quoteToEnglish(q) : q;
}

/** Sepet hesabı Türkçe üretilir; İngilizce sayfada ürün adları ve uyarılar çevrilir (tutarlar aynı). */
async function quoteToEnglish(q: Quote): Promise<Quote> {
  const names = new Map(
    (await localize(q.lines.map((l) => ({ id: l.productId, name: l.name })), "product", "en")).map((x) => [x.id, x.name]),
  );
  const nm = (s: string) => {
    for (const l of q.lines) if (names.get(l.productId) && s.includes(l.name)) s = s.replaceAll(l.name, names.get(l.productId)!);
    return s;
  };
  const tr = (s: string) =>
    nm(s)
      .replace(/^Sepetteki bir ürün artık satışta değil, sepetten çıkarıldı\.$/, "An item in your cart is no longer for sale and was removed.")
      .replace(/^Sepetindeki bir ürün artık satışta olmadığı için sepetten çıkarıldı\.$/, "An item in your cart is no longer for sale, so it was removed.")
      .replace(/^(.+) stokta kalmadığı için sepetten çıkarıldı\.$/, "$1 is out of stock and was removed from your cart.")
      .replace(/^(.+): stokta (\d+) adet kaldığı için adet \d+ yapıldı\.$/, "$1: only $2 left in stock, so the quantity was set to $2.")
      .replace(/^(.+): Stokta yok$/, "$1: Out of stock")
      .replace(/^(.+): Stokta (\d+) adet var$/, "$1: Only $2 in stock")
      .replace(/^Stokta yok$/, "Out of stock")
      .replace(/^Stokta (\d+) adet var$/, "Only $1 in stock")
      .replace(/^Kupon kodu geçersiz veya süresi dolmuş\.$/, "This coupon code is invalid or has expired.")
      .replace(/^Bu kupon ([\d.,]+) TL ve üzeri sepette geçerli\.$/, "This coupon is valid on carts of $1 TL or more.")
      .replace(/^Bu kuponu kullanım hakkın doldu\.$/, "You have already used this coupon the maximum number of times.")
      .replace(/^Bu kupon sepetindeki ürünlerde geçerli değil\.$/, "This coupon doesn't apply to the items in your cart.")
      .replace(/^Paket indirimi daha avantajlı; kupon yerine paket indirimi uygulandı\. İndirimler birleştirilmez\.$/, "The bundle discount is a better deal, so it was applied instead of the coupon. Discounts can't be combined.")
      .replace(/^Sepetindeki "(.+)" kampanyası paket indiriminden daha avantajlı; o uygulandı\. İndirimler birleştirilmez\.$/, 'The "$1" offer in your cart beats the bundle discount, so it was applied instead. Discounts can\'t be combined.')
      .replace(/^Sepetindeki "(.+)" kampanyası daha avantajlı; kupon yerine o uygulandı\. Kampanyalar birleştirilmez\.$/, 'The "$1" offer in your cart is a better deal, so it was applied instead of the coupon. Offers can\'t be combined.');
  const campaign = q.campaign ? (await localize([q.campaign], "campaign", "en"))[0] : null;
  const bundles = q.bundles.length ? await localize(q.bundles, "bundle", "en") : q.bundles;
  return {
    ...q,
    campaign,
    bundles,
    bundleNote: q.bundleNote ? tr(q.bundleNote) : q.bundleNote,
    lines: q.lines.map((l) => ({ ...l, name: names.get(l.productId) ?? l.name, error: l.error ? tr(l.error) : l.error })),
    errors: q.errors.map(tr),
    fixes: q.fixes.map((f) => ({ ...f, message: tr(f.message) })),
    couponError: q.couponError ? tr(q.couponError) : q.couponError,
    couponNote: q.couponNote ? tr(q.couponNote) : q.couponNote,
  };
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
    const { notifyStaff } = await import("@/lib/notify");
    await notifyStaff({ perm: "inbox.manage", kind: "message", title: `Ürün sorusu: ${p.name}`, body: `${name}: ${question.slice(0, 140)}`, href: `/admin/mesajlar?id=${c.id}` });
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
    const contact = str(fd.get("contact")).slice(0, 120);
    if (contact.length < 6) return fail("E-posta veya telefon girin.");
    if (!(await allowIp("stock-alert", 10, 60 * 60 * 1000))) return fail("Çok fazla deneme. Biraz sonra tekrar dene.");
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
    const { notifyStaff } = await import("@/lib/notify");
    await notifyStaff({ perm: "inbox.manage", kind: "message", title: `Yeni mesaj: ${subject}`, body: `${name}: ${body.slice(0, 140)}`, href: `/admin/mesajlar?id=${c.id}` });
    return ok("Mesajın alındı. Çalışma saatlerinde en geç birkaç saat içinde dönüyoruz.");
  });
}

export async function subscribe(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const email = str(fd.get("email")).toLowerCase().slice(0, 160);
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Geçerli bir e-posta girin.");
    if (!(await allowIp("subscribe", 5, 60 * 60 * 1000))) return fail("Çok fazla deneme. Biraz sonra tekrar dene.");
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
