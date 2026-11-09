"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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
    revalidatePath("/", "layout");
    return ok(`Stok güncellendi: ${p.stock} → ${p.stock + delta}`);
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
    revalidatePath("/", "layout");
    return ok(`${list.length} seri numarası eklendi, stok ${list.length} arttı.`);
  });
}

export async function setSerialStatus(id: string, status: "IN_STOCK" | "DEFECTIVE" | "IN_SERVICE" | "RETURNED"): Promise<ActionResult> {
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
    await audit(staff.id, "stock", "serial", id, `${s.serial} durumu ${status}`);
    revalidatePath("/admin/stok");
    return ok("Seri no durumu güncellendi.");
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
    revalidatePath("/admin/stok");
    return ok("Seri numarası silindi.");
  });
}
