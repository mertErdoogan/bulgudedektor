import { NextResponse } from "next/server";
import { and, eq, gt, inArray, isNull, lt, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartSnapshots, customers, orders, passwordResets, productActivity, rateHits, productImages, products } from "@/db/schema";
import { mailCartReminder, mailReviewRequest } from "@/lib/mail";
import { expireStalePendingOrders } from "@/lib/orders";

/**
 * Zamanlanmış işler. Her 15 dakikada bir çağrılmalı:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://site.com/api/cron
 * (Vercel Cron, cron-job.org, sunucu crontab'ı veya Coolify zamanlanmış görev)
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const H = 3600_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const q = new URL(req.url).searchParams.get("key");
  if (!secret || (auth !== `Bearer ${secret}` && q !== secret)) return NextResponse.json({ ok: false }, { status: 401 });

  const out: Record<string, number | string> = {};
  const run = async (name: string, fn: () => Promise<number>) => {
    try {
      out[name] = await fn();
    } catch (e) {
      out[name] = `hata: ${e instanceof Error ? e.message : e}`;
    }
  };

  // 1) Süresi dolan kartlı ödemeleri iptal et, stoğu geri al
  await run("expiredPayments", expireStalePendingOrders);

  // 2) Teslimattan 3 gün sonra yorum daveti (en fazla 14 gün geriye)
  await run("reviewRequests", async () => {
    const due = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "DELIVERED"), isNull(orders.reviewRequestedAt), lt(orders.deliveredAt, new Date(Date.now() - 72 * H)), gt(orders.deliveredAt, new Date(Date.now() - 14 * 24 * H))))
      .limit(50);
    for (const o of due) {
      await db.update(orders).set({ reviewRequestedAt: new Date() }).where(eq(orders.id, o.id));
      await mailReviewRequest(o.id);
    }
    return due.length;
  });

  // 3) Terk edilen sepet: 3–48 saat önce güncellenmiş, izinli, sonrasında sipariş verilmemiş
  await run("cartReminders", async () => {
    const snaps = await db
      .select()
      .from(cartSnapshots)
      .leftJoin(customers, eq(customers.id, cartSnapshots.customerId))
      .where(
        and(
          isNull(cartSnapshots.remindedAt),
          isNull(cartSnapshots.recoveredAt),
          lt(cartSnapshots.updatedAt, new Date(Date.now() - 3 * H)),
          gt(cartSnapshots.updatedAt, new Date(Date.now() - 48 * H)),
          or(eq(cartSnapshots.consent, true), eq(customers.marketingConsent, true)),
        ),
      )
      .limit(50);
    let sent = 0;
    for (const { cart_snapshots: c } of snaps) {
      const ordered = await db.query.orders.findFirst({
        where: and(eq(orders.email, c.email), gt(orders.createdAt, new Date(c.updatedAt.getTime() - H)), notInArray(orders.status, ["CANCELLED"]), ne(orders.status, "PENDING_PAYMENT")),
        columns: { id: true },
      });
      if (ordered) {
        await db.update(cartSnapshots).set({ recoveredAt: new Date() }).where(eq(cartSnapshots.id, c.id));
        continue;
      }
      const ids = c.items.map((i) => i.productId);
      const rows = ids.length
        ? await db
            .select({
              id: products.id,
              name: products.name,
              slug: products.slug,
              price: products.price,
              image: sql<string | null>`(select ${productImages.url} from ${productImages} where ${productImages.productId} = ${products.id} order by ${productImages.sortOrder} limit 1)`,
            })
            .from(products)
            .where(and(inArray(products.id, ids), eq(products.status, "ACTIVE")))
        : [];
      await db.update(cartSnapshots).set({ remindedAt: new Date() }).where(eq(cartSnapshots.id, c.id));
      if (!rows.length) continue;
      const items = rows.map((r) => ({ ...r, qty: c.items.find((i) => i.productId === r.id)?.qty ?? 1 }));
      if (await mailCartReminder(c.email, c.name, items)) sent++;
    }
    return sent;
  });

  // 4) Temizlik: 30 günden eski etkileşim kovaları, süresi geçmiş şifre bağlantıları
  await run("cleanup", async () => {
    const a = await db.delete(productActivity).where(lt(productActivity.hour, new Date(Date.now() - 30 * 24 * H))).returning({ p: productActivity.productId });
    const b = await db.delete(passwordResets).where(lt(passwordResets.expiresAt, new Date(Date.now() - 7 * 24 * H))).returning({ id: passwordResets.id });
    await db.delete(rateHits).where(lt(rateHits.windowStart, new Date(Date.now() - 24 * H)));
    return a.length + b.length;
  });

  // 5) Trendyol: yeni siparişleri al, fiyat/stok gönder (ayarlarda açıksa)
  await run("trendyol", async () => {
    const { isTrendyolOn, trendyolSync } = await import("@/lib/trendyol");
    if (!(await isTrendyolOn())) return 0;
    const r = await trendyolSync();
    if (!r.ok) throw new Error(r.message);
    return 1;
  });

  // 6) Hepsiburada (ayarlarda açıksa)
  await run("hepsiburada", async () => {
    const { isHepsiburadaOn, hepsiburadaSync } = await import("@/lib/hepsiburada");
    if (!(await isHepsiburadaOn())) return 0;
    const r = await hepsiburadaSync();
    if (!r.ok) throw new Error(r.message);
    return 1;
  });

  return NextResponse.json({ ok: true, at: new Date().toISOString(), ...out });
}
