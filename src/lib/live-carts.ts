import { q } from "@/db/q";
import "server-only";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartSnapshots, customers, liveCarts, productImages, products } from "@/db/schema";

const MIN = 60 * 1000;
/** Bu süre içinde hareket gören sepet "şu an aktif" sayılır */
export const LIVE_WINDOW = 30 * MIN;
/** Bundan uzun süredir dokunulmayan, siparişe dönmemiş sepet "terk edilmiş" sayılır */
export const ABANDON_AFTER = 60 * MIN;

/** Sipariş verilince ziyaretçinin canlı sepetini "siparişe dönüştü" olarak işaretler */
export async function markLiveCartOrdered(o: { orderId: string; email: string; customerId: string | null; vid?: string | null }) {
  const recent = gt(liveCarts.updatedAt, new Date(Date.now() - 3 * 24 * 60 * MIN));
  const who = [eq(liveCarts.email, o.email.toLowerCase())];
  if (o.customerId) who.push(eq(liveCarts.customerId, o.customerId));
  if (o.vid && /^[0-9a-f-]{36}$/i.test(o.vid)) who.push(eq(liveCarts.id, o.vid));
  await db
    .update(liveCarts)
    .set({ orderedAt: new Date(), orderId: o.orderId, email: o.email.toLowerCase() })
    .where(and(isNull(liveCarts.orderedAt), recent, or(...who)));
}

/** Ödeme formunda e-posta yazılınca canlı sepete kişi bilgisi eklenir */
export async function attachEmail(vid: string, email: string, name: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(vid)) return;
  await db
    .update(liveCarts)
    .set({ email: email.toLowerCase(), ...(name ? { name } : {}) })
    .where(and(eq(liveCarts.id, vid), isNull(liveCarts.orderedAt)));
}

export type CartView = "canli" | "terk" | "donusen";

export async function cartStats() {
  const now = Date.now();
  const week = new Date(now - 7 * 24 * 60 * MIN);
  const [[live], [abandoned], [converted], [reminders]] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int`, v: sql<number>`coalesce(sum(${liveCarts.value}),0)::float` })
      .from(liveCarts)
      .where(and(isNull(liveCarts.orderedAt), gt(liveCarts.updatedAt, new Date(now - LIVE_WINDOW)))),
    db
      .select({ n: sql<number>`count(*)::int`, v: sql<number>`coalesce(sum(${liveCarts.value}),0)::float` })
      .from(liveCarts)
      .where(and(isNull(liveCarts.orderedAt), lt(liveCarts.updatedAt, new Date(now - ABANDON_AFTER)), gt(liveCarts.updatedAt, week))),
    db
      .select({ n: sql<number>`count(*)::int`, v: sql<number>`coalesce(sum(${liveCarts.value}),0)::float` })
      .from(liveCarts)
      .where(and(isNotNull(liveCarts.orderedAt), gt(liveCarts.orderedAt, week))),
    db
      .select({ sent: sql<number>`count(*) filter (where ${cartSnapshots.remindedAt} is not null)::int`, back: sql<number>`count(*) filter (where ${cartSnapshots.remindedAt} is not null and ${cartSnapshots.recoveredAt} is not null)::int` })
      .from(cartSnapshots)
      .where(gt(cartSnapshots.updatedAt, week)),
  ]);
  const rate = converted.n + abandoned.n > 0 ? Math.round((converted.n / (converted.n + abandoned.n)) * 100) : null;
  return { live, abandoned, converted, reminders, rate };
}

export async function listCarts(view: CartView, limit = 100) {
  const now = Date.now();
  const where =
    view === "canli"
      ? and(isNull(liveCarts.orderedAt), gt(liveCarts.updatedAt, new Date(now - LIVE_WINDOW)))
      : view === "terk"
        ? and(isNull(liveCarts.orderedAt), lt(liveCarts.updatedAt, new Date(now - ABANDON_AFTER)), gt(liveCarts.updatedAt, new Date(now - 30 * 24 * 60 * MIN)))
        : isNotNull(liveCarts.orderedAt);
  const rows = await db
    .select({
      id: liveCarts.id,
      email: liveCarts.email,
      name: liveCarts.name,
      customerId: liveCarts.customerId,
      phone: customers.phone,
      customerConsent: customers.marketingConsent,
      items: liveCarts.items,
      value: liveCarts.value,
      itemCount: liveCarts.itemCount,
      path: liveCarts.path,
      locale: liveCarts.locale,
      createdAt: liveCarts.createdAt,
      updatedAt: liveCarts.updatedAt,
      orderedAt: liveCarts.orderedAt,
      orderId: liveCarts.orderId,
    })
    .from(liveCarts)
    .leftJoin(customers, eq(customers.id, liveCarts.customerId))
    .where(where)
    .orderBy(desc(view === "donusen" ? liveCarts.orderedAt : liveCarts.updatedAt))
    .limit(limit);

  const ids = [...new Set(rows.flatMap((r) => r.items.map((i) => i.productId)))];
  const prods = ids.length
    ? await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          image: sql<string | null>`(select ${q(productImages.url)} from ${productImages} where ${q(productImages.productId)} = ${q(products.id)} order by ${q(productImages.sortOrder)} limit 1)`,
        })
        .from(products)
        .where(inArray(products.id, ids))
    : [];
  const pm = new Map(prods.map((p) => [p.id, p]));
  // Hatırlatma e-postası durumu (terk edilen sepet e-postası e-posta adresine bağlıdır)
  const emails = [...new Set(rows.map((r) => r.email).filter((e): e is string => !!e))];
  const snaps = emails.length ? await db.select().from(cartSnapshots).where(inArray(cartSnapshots.email, emails)) : [];
  const sm = new Map(snaps.map((s) => [s.email, s]));
  return rows.map((r) => {
    const snap = r.email ? sm.get(r.email) : undefined;
    return {
      ...r,
      lines: r.items.map((i) => ({ ...i, product: pm.get(i.productId) ?? null })),
      remindedAt: snap?.remindedAt ?? null,
      consent: !!(snap?.consent || r.customerConsent),
    };
  });
}

/** Panelden elle hatırlatma: izin varsa sepet e-postası gönderilir (otomatik hatırlatmayla aynı şablon) */
export async function remindCart(id: string) {
  const [c] = await listCarts("terk", 500).then((l) => l.filter((x) => x.id === id));
  if (!c) return { ok: false as const, error: "Sepet bulunamadı ya da siparişe dönüşmüş." };
  if (!c.email) return { ok: false as const, error: "Bu ziyaretçinin e-postası yok." };
  if (!c.consent) return { ok: false as const, error: "Müşterinin ticari ileti izni yok; e-posta gönderilemez. Telefonla ya da WhatsApp'tan ulaşabilirsin." };
  if (c.remindedAt && Date.now() - c.remindedAt.getTime() < 24 * 60 * MIN) return { ok: false as const, error: "Son 24 saatte hatırlatma gönderilmiş." };
  const items = c.lines.filter((l) => l.product).map((l) => ({ name: l.product!.name, slug: l.product!.slug, price: l.product!.price, image: l.product!.image, qty: l.qty }));
  if (!items.length) return { ok: false as const, error: "Sepetteki ürünler artık satışta değil." };
  const { mailCartReminder } = await import("./mail");
  const sent = await mailCartReminder(c.email, c.name, items);
  if (!sent) return { ok: false as const, error: "E-posta gönderilemedi. SMTP ayarlarını kontrol et." };
  await db
    .insert(cartSnapshots)
    .values({ email: c.email, name: c.name, customerId: c.customerId, items: c.items, consent: true, remindedAt: new Date() })
    .onConflictDoUpdate({ target: cartSnapshots.email, set: { remindedAt: new Date() } });
  return { ok: true as const };
}

/** Eski kayıtları temizler: 30 günü geçen terk edilmiş, 90 günü geçen siparişe dönmüş sepetler */
export async function cleanupCarts() {
  const d = (days: number) => new Date(Date.now() - days * 24 * 60 * MIN);
  const a = await db.delete(liveCarts).where(and(isNull(liveCarts.orderedAt), lt(liveCarts.updatedAt, d(30)))).returning({ id: liveCarts.id });
  const b = await db.delete(liveCarts).where(and(isNotNull(liveCarts.orderedAt), lt(liveCarts.orderedAt, d(90)))).returning({ id: liveCarts.id });
  return a.length + b.length;
}
