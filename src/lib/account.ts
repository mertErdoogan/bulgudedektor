import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { addresses, cartSnapshots, customerNotes, customers, favorites, newsletterSubscribers, orderItems, orders, returnRequests, reviews, serviceRecords } from "@/db/schema";
import { sendMail, wrap } from "./mail";
import { getSettings } from "./settings";

// ───────────── E-posta doğrulama (durumsuz, imzalı bağlantı; 3 gün geçerli)
const sign = (email: string, exp: number) => createHmac("sha256", process.env.AUTH_SECRET || "dev-secret").update(`verify:${email.toLowerCase()}:${exp}`).digest("base64url").slice(0, 32);

export function verifyEmailLink(email: string) {
  const exp = Math.floor(Date.now() / 1000) + 3 * 86400;
  return `${process.env.APP_URL || ""}/eposta-dogrula?e=${encodeURIComponent(email)}&x=${exp}&t=${sign(email, exp)}`;
}

export function checkEmailToken(email: string, exp: string, token: string) {
  const x = Number(exp);
  if (!email || !Number.isFinite(x) || x * 1000 < Date.now()) return false;
  const a = Buffer.from(sign(email, x));
  const b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function sendVerification(c: { name: string; email: string | null }) {
  if (!c.email) return { sent: false, devLink: null as string | null };
  const s = await getSettings();
  const link = verifyEmailLink(c.email);
  const sent = await sendMail(
    c.email,
    `E-posta adresini doğrula · ${s.store.name}`,
    wrap(
      `<p>Merhaba ${c.name.split(" ")[0]},</p><p>Hesabını güvene almak ve sipariş/garanti bildirimlerini kaçırmamak için e-posta adresini doğrula:</p><p><a href="${link}" style="display:inline-block;background:#d42e1e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">E-postamı doğrula</a></p><p style="color:#66666b;font-size:12px">Bağlantı 3 gün geçerlidir. Bu hesabı sen açmadıysan bu e-postayı yok sayabilirsin.</p>`,
      s.store.name,
    ),
  );
  // E-posta ayarı yokken yerel/test ortamında bağlantı ekranda gösterilir; canlı alan adında asla
  const local = !/^https:\/\//.test(process.env.APP_URL || "") || /localhost|127\.0\.0\.1|\.local\b|\.test\b/.test(process.env.APP_URL || "");
  return { sent, devLink: !sent && (process.env.NODE_ENV !== "production" || local) ? link : null };
}

// ───────────── KVKK: veri dökümü ve hesap silme
/** Müşterinin bizde tutulan tüm kişisel verilerinin okunabilir dökümü (KVKK m.11 bilgi talebi). */
export async function exportCustomerData(customerId: string) {
  const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!c) return null;
  const [addr, ords, svc, revs, favs, subs, carts] = await Promise.all([
    db.select().from(addresses).where(eq(addresses.customerId, customerId)),
    db.select().from(orders).where(eq(orders.customerId, customerId)).orderBy(desc(orders.createdAt)),
    db.select().from(serviceRecords).where(eq(serviceRecords.customerId, customerId)),
    db.select().from(reviews).where(eq(reviews.customerId, customerId)),
    db.select().from(favorites).where(eq(favorites.customerId, customerId)),
    c.email ? db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, c.email)) : Promise.resolve([]),
    c.email ? db.select().from(cartSnapshots).where(eq(cartSnapshots.email, c.email)) : Promise.resolve([]),
  ]);
  const items = ords.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ords.map((o) => o.id))) : [];
  const rets = ords.length ? await db.select().from(returnRequests).where(inArray(returnRequests.orderId, ords.map((o) => o.id))) : [];
  return {
    olusturulma: new Date().toISOString(),
    aciklama: "6698 sayılı KVKK m.11 kapsamında hesabınıza ait kişisel verilerin dökümüdür.",
    hesap: { ad: c.name, eposta: c.email, telefon: c.phone, epostaDogrulandi: c.emailVerifiedAt, ticariIletiIzni: c.marketingConsent, izinTarihi: c.consentAt, kayitTarihi: c.createdAt, sonGorulme: c.lastSeenAt },
    adresler: addr.map(({ customerId: _c, ...a }) => a),
    siparisler: ords.map((o) => ({
      no: o.number,
      tarih: o.createdAt,
      durum: o.status,
      odeme: { yontem: o.paymentMethod, durum: o.paymentStatus, taksit: o.installments },
      tutar: { araToplam: o.subtotal, indirim: o.discountTotal, kargo: o.shippingTotal, toplam: o.total },
      eposta: o.email,
      telefon: o.phone,
      teslimatAdresi: o.shippingAddress,
      fatura: { tip: o.invoiceType, unvan: o.companyName, vergiDairesi: o.taxOffice, vergiNo: o.taxNumber, faturaNo: o.invoiceNo },
      kargo: { firma: o.carrier, takipNo: o.trackingNumber },
      not: o.customerNote,
      urunler: items.filter((i) => i.orderId === o.id).map((i) => ({ ad: i.name, adet: i.quantity, birimFiyat: i.unitPrice, toplam: i.total })),
      iadeler: rets.filter((r) => r.orderId === o.id).map((r) => ({ durum: r.status, sebep: r.reason, tarih: r.createdAt })),
    })),
    servisKayitlari: svc.map((x) => ({ no: x.number, urun: x.productName, seriNo: x.serial, sorun: x.issue, durum: x.status, tarih: x.createdAt })),
    yorumlar: revs.map((r) => ({ urunId: r.productId, puan: r.rating, metin: r.body, tarih: r.createdAt })),
    favoriler: favs.map((f) => ({ urunId: f.productId, tarih: f.createdAt })),
    bulten: subs.map((x) => ({ aktif: x.isActive, izinTarihi: x.consentAt })),
    sepetHatirlatma: carts.map((x) => ({ izin: x.consent, guncelleme: x.updatedAt })),
  };
}

/**
 * Hesabı siler: kimlik ve iletişim bilgileri anonimleştirilir, adresler/favoriler/notlar silinir, ticari ileti izinleri kaldırılır.
 * Sipariş ve fatura kayıtları vergi mevzuatı gereği (10 yıl) saklanır ama sipariş üzerindeki e-posta/telefon da maskelenir.
 */
export async function anonymizeCustomer(customerId: string) {
  const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!c) return false;
  const tag = customerId.slice(0, 8);
  await db.transaction(async (tx) => {
    if (c.email) {
      await tx.update(newsletterSubscribers).set({ isActive: false }).where(eq(newsletterSubscribers.email, c.email));
      await tx.delete(cartSnapshots).where(eq(cartSnapshots.email, c.email));
    }
    await tx.delete(addresses).where(eq(addresses.customerId, customerId));
    await tx.delete(favorites).where(eq(favorites.customerId, customerId));
    await tx.delete(customerNotes).where(eq(customerNotes.customerId, customerId));
    await tx.update(reviews).set({ name: "Silinmiş kullanıcı", customerId: null }).where(eq(reviews.customerId, customerId));
    await tx.update(orders).set({ email: `silindi-${tag}@anonim.local`, phone: "-", customerNote: null }).where(eq(orders.customerId, customerId));
    await tx
      .update(customers)
      .set({ name: "Silinmiş müşteri", email: null, phone: null, passwordHash: null, tags: [], marketingConsent: false, consentAt: null, isBlocked: true, cardUserKey: null, emailVerifiedAt: null, deletedAt: new Date() })
      .where(eq(customers.id, customerId));
  });
  return true;
}
