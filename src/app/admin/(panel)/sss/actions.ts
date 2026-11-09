"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { str, strOrNull, toNum } from "@/lib/utils";

export async function saveFaq(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = strOrNull(fd.get("id"));
    const kind = str(fd.get("kind")) === "GLOSSARY" ? "GLOSSARY" : "FAQ";
    const question = str(fd.get("question"));
    const answer = str(fd.get("answer"));
    if (question.length < 2) return fail(kind === "FAQ" ? "Soru boş olamaz." : "Terim boş olamaz.");
    if (answer.length < 10) return fail("Cevap en az 10 karakter olmalı.");
    const productId = kind === "FAQ" ? strOrNull(fd.get("productId")) : null;
    const categoryId = kind === "FAQ" && !productId ? strOrNull(fd.get("categoryId")) : null;
    const values = {
      kind: kind as "FAQ" | "GLOSSARY",
      question,
      answer,
      group: str(fd.get("group")) || "Genel",
      productId,
      categoryId,
      sortOrder: toNum(fd.get("sortOrder"), 0),
      isPublished: fd.get("isPublished") === "on",
      showOnHome: kind === "FAQ" && fd.get("showOnHome") === "on",
      updatedAt: new Date(),
    };
    if (id) await db.update(faqs).set(values).where(eq(faqs.id, id));
    else await db.insert(faqs).values(values);
    await audit(staff.id, id ? "update" : "create", "faq", id, `${kind === "FAQ" ? "SSS" : "Sözlük"}: ${question}`);
    revalidatePath("/", "layout");
    return ok("Kaydedildi.", { redirect: `/admin/sss?t=${kind === "FAQ" ? "sss" : "sozluk"}` });
  });
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    await db.delete(faqs).where(eq(faqs.id, id));
    await audit(staff.id, "delete", "faq", id, "SSS/sözlük kaydı silindi");
    revalidatePath("/", "layout");
    return ok("Silindi.");
  });
}
