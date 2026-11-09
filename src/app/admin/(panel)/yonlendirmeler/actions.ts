"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { redirects } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { str } from "@/lib/utils";

const norm = (p: string) => {
  let v = p.trim();
  try {
    if (/^https?:\/\//.test(v)) v = new URL(v).pathname;
  } catch {}
  if (!v.startsWith("/")) v = "/" + v;
  return v.length > 1 ? v.replace(/\/$/, "") : v;
};

export async function saveRedirect(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const fromPath = norm(str(fd.get("fromPath")));
    const rawTo = str(fd.get("toPath"));
    const toPath = /^https:\/\//.test(rawTo) ? rawTo : norm(rawTo);
    if (fromPath === "/" || fromPath.length < 2) return fail("Kaynak adres geçersiz.");
    if (fromPath === toPath) return fail("Kaynak ve hedef aynı olamaz.");
    if (/^\/(admin|api|media|_next)\b/.test(fromPath)) return fail("Sistem adresleri yönlendirilemez.");
    await db.insert(redirects).values({ fromPath, toPath }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath } });
    await audit(staff.id, "create", "redirect", null, `${fromPath} → ${toPath}`);
    revalidatePath("/admin/yonlendirmeler");
    return ok("Yönlendirme kaydedildi.");
  });
}

export async function deleteRedirect(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    await db.delete(redirects).where(eq(redirects.id, id));
    await audit(staff.id, "delete", "redirect", id, "Yönlendirme silindi");
    revalidatePath("/admin/yonlendirmeler");
    return ok("Silindi.");
  });
}
