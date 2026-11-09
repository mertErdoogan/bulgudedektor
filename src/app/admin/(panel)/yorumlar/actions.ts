"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { productQuestions, reviews } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { assertStaff } from "@/lib/auth";
import { str, strOrNull } from "@/lib/utils";

export async function moderateReview(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("reviews.manage");
    const id = str(fd.get("id"));
    const op = str(fd.get("op"));
    if (op === "delete") await db.delete(reviews).where(eq(reviews.id, id));
    else await db.update(reviews).set({ isApproved: op === "approve" ? true : op === "hide" ? false : undefined, reply: strOrNull(fd.get("reply")) }).where(eq(reviews.id, id));
    revalidatePath("/", "layout");
    return ok(op === "delete" ? "Yorum silindi." : "Yorum güncellendi.");
  });
}

export async function answerQuestion(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("reviews.manage");
    const id = str(fd.get("id"));
    if (str(fd.get("op")) === "delete") {
      await db.delete(productQuestions).where(eq(productQuestions.id, id));
      revalidatePath("/", "layout");
      return ok("Soru silindi.");
    }
    const answer = str(fd.get("answer"));
    if (!answer) return fail("Yanıt yazın.");
    await db.update(productQuestions).set({ answer, answeredAt: new Date(), isPublished: fd.get("isPublished") === "on" }).where(eq(productQuestions.id, id));
    revalidatePath("/", "layout");
    return ok("Yanıt kaydedildi.");
  });
}
