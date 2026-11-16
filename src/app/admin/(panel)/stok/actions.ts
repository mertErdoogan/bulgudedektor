"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidateStore } from "@/lib/revalidate";
import { db } from "@/db";
import { products, serialNumbers } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { adjustStock } from "@/lib/orders";
import { lines, str, strOrNull, toNum } from "@/lib/utils";

export async function adjustStockAction(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inventory.manage");
    const productId = str(fd.get("productId"));
    const mode = str(fd.get("mode"));
    const qty = Math.floor(toNum(fd.get("qty"), NaN));
    const reason = str(fd.get("reason")) || "ADJUST";
    const note = strOrNull(fd.get("note"));
    if (!Number.isFinite(qty)) return fail("Adet girin.");
    const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!p) return fail("Ürün bulunamadı.");
    if (p.trackSerial) return fail("Bu ürün seri numarası ile takip ediliyor; stok, seri no ekleyip çıkararak değişir.");
    const delta = mode === "set" ? qty - p.stock : mode === "out" ? -Math.abs(qty) : Math.abs(qty);
    if (delta === 0) return fail("Stok zaten bu değerde.");
    if (p.stock + delta < 0) return fail(`Stok eksiye düşemez (mevcut ${p.stock}).`);
    await db.transaction((tx) => adjustStock(tx, productId, delta, reason, staff.id, note ?? undefined));
    await audit(staff.id, "stock", "product", productId, `${p.name} stok ${delta > 0 ? "+" : ""}${delta} (${reason})`);
    if (p.stock <= 0 && p.stock + delta > 0) void import("@/lib/mail").then((m) => m.notifyStockAlerts(productId));
    revalidateStore("/", "layout");
    // Seçili ürün sabit kalsın: liste stoğa göre yeniden sıralansa da form başka ürüne kaymasın
    return ok(`${p.name}: stok ${p.stock} → ${p.stock + delta}`, { redirect: `/admin/stok?urun=${productId}` });
  });
}

export async function addSerials(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inventory.manage");
    const productId = str(fd.get("productId"));
    const list = [...new Set(lines(fd.get("serials")).flatMap((l) => l.split(/[,;\s]+/)).map((s) => s.trim().toUpperCase()).filter(Boolean))];
    if (!list.length) return fail("En az bir seri numarası girin.");
    const p = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!p) return fail("Ürün bulunamadı.");
    const existing = await db.select({ serial: serialNumbers.serial }).from(serialNumbers).where(inArray(serialNumbers.serial, list));
    if (existing.length) return fail(`Zaten kayıtlı: ${existing.map((e) => e.serial).slice(0, 5).join(", ")}`);
    await db.transaction(async (tx) => {
      await tx.insert(serialNumbers).values(list.map((serial) => ({ productId, serial })));
      if (!p.trackSerial) await tx.update(products).set({ trackSerial: true }).where(eq(products.id, productId));
      await adjustStock(tx, productId, list.length, "PURCHASE", staff.id, `${list.length} seri no girişi`);
    });
    await audit(staff.id, "stock", "product", productId, `${p.name}: ${list.length} seri no eklendi`, { serials: list });
    if (p.stock <= 0) void import("@/lib/mail").then((m) => m.notifyStockAlerts(productId));
    revalidateStore("/", "layout");
    return ok(`${p.name}: ${list.length} seri numarası eklendi, stok ${list.length} arttı.`, { redirect: `/admin/stok?urun=${productId}` });
  });
}

export async function setSerialStatus(id: string, status: "IN_STOCK" | "DEFECTIVE" | "IN_SERVICE" | "RETURNED" | "LOST"): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inventory.manage");
    const s = await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.id, id) });
    if (!s) return fail("Seri no bulunamadı.");
    if (s.status === "SOLD" && status === "IN_STOCK") return fail("Satılmış cihaz doğrudan stoğa alınamaz; iade sürecini kullanın.");
    const wasInStock = s.status === "IN_STOCK";
    const willBeInStock = status === "IN_STOCK";
    await db.transaction(async (tx) => {
      await tx.update(serialNumbers).set({ status }).where(eq(serialNumbers.id, id));
      if (wasInStock !== willBeInStock) await adjustStock(tx, s.productId, willBeInStock ? 1 : -1, "SERIAL_STATUS", staff.id, `${s.serial} → ${status}`);
    });
    await audit(staff.id, "stock", "serial", id, `${s.serial} durumu ${status === "LOST" ? "KAYIP (sayımda bulunamadı)" : status}`);
    revalidateStore("/admin/stok");
    return ok(status === "LOST" ? `${s.serial} kayıp olarak işaretlendi, stoktan düştü.` : "Seri no durumu güncellendi.");
  });
}

export async function deleteSerial(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inventory.manage");
    const s = await db.query.serialNumbers.findFirst({ where: eq(serialNumbers.id, id) });
    if (!s) return fail("Bulunamadı.");
    if (s.status === "SOLD") return fail("Satılmış cihazın seri numarası silinemez.");
    await db.transaction(async (tx) => {
      await tx.delete(serialNumbers).where(and(eq(serialNumbers.id, id)));
      if (s.status === "IN_STOCK") await adjustStock(tx, s.productId, -1, "SERIAL_DELETE", staff.id, `${s.serial} silindi`);
    });
    await audit(staff.id, "delete", "serial", id, `${s.serial} silindi`);
    revalidateStore("/admin/stok");
    return ok("Seri numarası silindi.");
  });
}

/**
 * Sayım modu: rafta okutulan seri numaralarını sistemdeki "stokta" kayıtlarla karşılaştırır. Hiçbir şeyi değiştirmez;
 * sonuçtan eksik cihazlar tek tek "kayıp" olarak işaretlenebilir.
 */
export async function reconcileSerials(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("inventory.manage");
    const productId = strOrNull(fd.get("productId"));
    const scanned = [...new Set(lines(fd.get("serials")).flatMap((l) => l.split(/[,;\s]+/)).map((x) => x.trim().toUpperCase()).filter(Boolean))];
    const expected = await db
      .select({ id: serialNumbers.id, serial: serialNumbers.serial, product: products.name })
      .from(serialNumbers)
      .innerJoin(products, eq(products.id, serialNumbers.productId))
      .where(and(eq(serialNumbers.status, "IN_STOCK"), productId ? eq(serialNumbers.productId, productId) : undefined));
    const set = new Set(scanned);
    const missing = expected.filter((e) => !set.has(e.serial));
    const known = scanned.length
      ? await db.select({ serial: serialNumbers.serial, status: serialNumbers.status, product: products.name, productId: serialNumbers.productId }).from(serialNumbers).innerJoin(products, eq(products.id, serialNumbers.productId)).where(inArray(serialNumbers.serial, scanned))
      : [];
    const unknown = scanned.filter((x) => !known.some((k) => k.serial === x));
    const odd = known.filter((k) => k.status !== "IN_STOCK" || (productId && k.productId !== productId));
    const found = expected.length - missing.length;
    await audit(staff.id, "stock", "count", null, `Seri no sayımı: ${scanned.length} okutuldu, ${found}/${expected.length} bulundu, ${missing.length} eksik, ${unknown.length} tanımsız`);
    return ok(missing.length || unknown.length || odd.length ? "Sayım bitti: farklar aşağıda." : "Sayım tutuyor: sistemdeki tüm cihazlar rafta.", {
      data: { expected: expected.length, found, missing, unknown, odd: odd.map((o) => ({ serial: o.serial, status: o.status, product: o.product })) },
    });
  });
}
