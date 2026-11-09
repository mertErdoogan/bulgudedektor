"use server";

import { revalidatePath } from "next/cache";
import { ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";

export async function completeSetup(done: boolean): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("settings.manage");
    await saveSettings("setup", { completed: done });
    await audit(staff.id, "settings", "setup", null, done ? "Kurulum tamamlandı" : "Kurulum yeniden açıldı");
    revalidatePath("/admin", "layout");
    return ok(done ? "Kurulum tamamlandı. Mağazan yayında!" : "Kurulum listesi yeniden açıldı.", { redirect: "/admin" });
  });
}
