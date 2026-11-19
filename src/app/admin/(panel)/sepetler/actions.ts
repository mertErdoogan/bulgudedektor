"use server";

import { revalidatePath } from "next/cache";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { requireStaff } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { remindCart } from "@/lib/live-carts";

export async function sendCartReminder(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await requireStaff("orders.view");
    const r = await remindCart(String(fd.get("id") ?? ""));
    if (!r.ok) return fail(r.error);
    await audit(staff.id, "update", "cart", String(fd.get("id")), "Terk edilen sepet için hatırlatma e-postası gönderildi");
    revalidatePath("/admin/sepetler");
    return ok("Hatırlatma e-postası gönderildi.");
  });
}
