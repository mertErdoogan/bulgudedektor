"use server";

import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bundleItems, bundles, products } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { saveEntityTranslations } from "@/lib/i18n/content";
import { revalidateStore } from "@/lib/revalidate";
import { str, strOrNull, toNum } from "@/lib/utils";


export async function saveBundle(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    if (!name) return fail("Paket adı zorunlu.");
    const discountType = str(fd.get("discountType")) === "FIXED" ? "FIXED" : "PERCENT";
    const discountValue = toNum(fd.get("discountValue"), 0);
    if (discountType === "PERCENT" && (discountValue <= 0 || discountValue > 90)) return fail("Yüzde indirim 1–90 arasında olmalı.");
    if (discountType === "FIXED" && discountValue <= 0) return fail("İndirim tutarını yazın.");

    // Ürünler: aynı ürün iki kez seçildiyse adetleri birleştirilir
    const ids = fd.getAll("itemProduct").map(String);
    const qtys = fd.getAll("itemQty").map((x) => Math.min(20, Math.max(1, Math.floor(Number(x) || 1))));
    const merged = new Map<string, number>();
    ids.forEach((pid, k) => {
      if (pid) merged.set(pid, (merged.get(pid) ?? 0) + (qtys[k] ?? 1));
    });
    if (merged.size < 2) return fail("Pakete en az 2 farklı ürün ekleyin.");
    const found = await db.select({ id: products.id, price: products.price }).from(products).where(inArray(products.id, [...merged.keys()]));
    if (found.length !== merged.size) return fail("Seçilen ürünlerden biri bulunamadı.");
    const setPrice = found.reduce((s, p) => s + p.price * merged.get(p.id)!, 0);
    if (discountType === "FIXED" && discountValue >= setPrice) return fail("Sabit indirim, paketteki ürünlerin toplam fiyatından küçük olmalı.");

    const startsAt = strOrNull(fd.get("startsAt"));
    const endsAt = strOrNull(fd.get("endsAt"));
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) return fail("Bitiş tarihi başlangıçtan önce olamaz.");
    const values = {
      name,
      description: strOrNull(fd.get("description")),
      discountType: discountType as "PERCENT" | "FIXED",
      discountValue,
      isActive: fd.get("isActive") === "on",
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      sortOrder: toNum(fd.get("sortOrder"), 0),
    };
    const bundleId = await db.transaction(async (tx) => {
      let bid = id;
      if (bid) await tx.update(bundles).set(values).where(eq(bundles.id, bid));
      else [{ id: bid }] = await tx.insert(bundles).values(values).returning({ id: bundles.id });
      await tx.delete(bundleItems).where(eq(bundleItems.bundleId, bid!));
      await tx.insert(bundleItems).values([...merged].map(([productId, quantity], k) => ({ bundleId: bid!, productId, quantity, sortOrder: k })));
      return bid!;
    });
    await saveEntityTranslations("bundle", bundleId, fd);
    await audit(staff.id, id ? "update" : "create", "bundle", bundleId, `Paket ${name}`);
    revalidateStore("/", "layout");
    return ok("Paket kaydedildi.", { redirect: "/admin/paketler" });
  });
}

export async function toggleBundle(id: string, active: boolean): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    await db.update(bundles).set({ isActive: active }).where(eq(bundles.id, id));
    await audit(staff.id, "status", "bundle", id, active ? "Paket başlatıldı" : "Paket durduruldu");
    revalidateStore("/", "layout");
    return ok(active ? "Paket yayında." : "Paket durduruldu.");
  });
}

export async function deleteBundle(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    await db.delete(bundles).where(eq(bundles.id, id));
    await audit(staff.id, "delete", "bundle", id, "Paket silindi");
    revalidateStore("/", "layout");
    return ok("Paket silindi.");
  });
}
