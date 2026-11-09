"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { str, strOrNull, toNum, toNumOrNull } from "@/lib/utils";

export async function saveCampaign(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    const id = strOrNull(fd.get("id"));
    const name = str(fd.get("name"));
    if (!name) return fail("Kampanya adı zorunlu.");
    const type = str(fd.get("type")) as "PERCENT" | "FIXED" | "FREE_SHIPPING";
    const value = toNum(fd.get("value"), 0);
    if (type === "PERCENT" && (value <= 0 || value > 90)) return fail("Yüzde indirim 1–90 arasında olmalı.");
    if (type === "FIXED" && value <= 0) return fail("İndirim tutarı girin.");
    const code = strOrNull(fd.get("code"))?.toUpperCase().replace(/\s/g, "") ?? null;
    if (code) {
      const dupe = await db.query.campaigns.findFirst({ where: id ? and(eq(campaigns.code, code), ne(campaigns.id, id)) : eq(campaigns.code, code) });
      if (dupe) return fail("Bu kupon kodu başka kampanyada kullanılıyor.");
    }
    const scope = str(fd.get("scope")) as "ALL" | "BRAND" | "CATEGORY" | "PRODUCT";
    const targetIds = fd.getAll("targetIds").map(String).filter(Boolean);
    if (scope !== "ALL" && !targetIds.length) return fail("Kampanyanın geçerli olacağı marka/kategori/ürünü seçin.");
    const startsAt = strOrNull(fd.get("startsAt"));
    const endsAt = strOrNull(fd.get("endsAt"));
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) return fail("Bitiş tarihi başlangıçtan önce olamaz.");
    const values = {
      name,
      description: strOrNull(fd.get("description")),
      type,
      value: type === "FREE_SHIPPING" ? 0 : value,
      code,
      scope,
      targetIds: scope === "ALL" ? [] : targetIds,
      minSubtotal: toNum(fd.get("minSubtotal"), 0),
      maxDiscount: toNumOrNull(fd.get("maxDiscount")),
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      usageLimit: toNumOrNull(fd.get("usageLimit")),
      perCustomerLimit: toNumOrNull(fd.get("perCustomerLimit")),
      isActive: fd.get("isActive") === "on",
      showOnSite: fd.get("showOnSite") === "on",
    };
    if (id) await db.update(campaigns).set(values).where(eq(campaigns.id, id));
    else await db.insert(campaigns).values(values);
    await audit(staff.id, id ? "update" : "create", "campaign", id, `Kampanya ${name}`);
    revalidatePath("/", "layout");
    return ok("Kampanya kaydedildi.", { redirect: "/admin/kampanyalar" });
  });
}

export async function toggleCampaign(id: string, active: boolean): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    await db.update(campaigns).set({ isActive: active }).where(eq(campaigns.id, id));
    await audit(staff.id, "update", "campaign", id, active ? "Kampanya açıldı" : "Kampanya durduruldu");
    revalidatePath("/", "layout");
    return ok(active ? "Kampanya açıldı." : "Kampanya durduruldu.");
  });
}

export async function deleteCampaign(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("campaigns.manage");
    await db.delete(campaigns).where(eq(campaigns.id, id));
    await audit(staff.id, "delete", "campaign", id, "Kampanya silindi");
    revalidatePath("/", "layout");
    return ok("Kampanya silindi.", { redirect: "/admin/kampanyalar" });
  });
}
