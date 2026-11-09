"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { pingIndexNow } from "@/lib/indexnow";
import { recordSlugChange } from "@/lib/redirects";
import { lines, slugify, str, strOrNull } from "@/lib/utils";

/** "Soru | Cevap" satırları → [{q,a}] */
function parseFaq(v: FormDataEntryValue | null) {
  return lines(v)
    .map((l) => {
      const i = l.indexOf("|");
      return i > 0 ? { q: l.slice(0, i).trim(), a: l.slice(i + 1).trim() } : null;
    })
    .filter((x): x is { q: string; a: string } => !!x && !!x.q && !!x.a);
}

export async function savePost(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = strOrNull(fd.get("id"));
    const title = str(fd.get("title"));
    if (title.length < 8) return fail("Başlık en az 8 karakter olmalı.");
    const slug = slugify(str(fd.get("slug")) || title);
    if (!slug) return fail("Geçerli bir URL girin.");
    const dupe = await db.query.posts.findFirst({ where: id ? and(eq(posts.slug, slug), ne(posts.id, id)) : eq(posts.slug, slug), columns: { id: true } });
    if (dupe) return fail("Bu URL başka bir yazıda kullanılıyor.");
    const status = str(fd.get("status")) === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const content = str(fd.get("content"));
    const answer = strOrNull(fd.get("answer"));
    if (status === "PUBLISHED") {
      if (!answer) return fail("Yayınlamak için 'Kısa cevap' alanını doldurun — AI aramalarda alıntılanan kısım budur.");
      if (content.length < 300) return fail("Yayınlamak için içerik en az 300 karakter olmalı.");
    }
    const pubRaw = str(fd.get("publishedAt"));
    const prev = id ? await db.query.posts.findFirst({ where: eq(posts.id, id) }) : null;
    const publishedAt = pubRaw ? new Date(pubRaw) : status === "PUBLISHED" ? (prev?.publishedAt ?? new Date()) : (prev?.publishedAt ?? null);
    if (publishedAt && Number.isNaN(publishedAt.getTime())) return fail("Yayın tarihi geçersiz.");
    const values = {
      title,
      slug,
      category: str(fd.get("category")) || "Rehber",
      excerpt: strOrNull(fd.get("excerpt")),
      answer,
      content,
      coverImage: strOrNull(fd.get("coverImage")),
      tags: str(fd.get("tags")).split(",").map((t) => t.trim()).filter(Boolean),
      authorName: str(fd.get("authorName")) || "Bulgu Dedektör Uzman Ekibi",
      authorTitle: strOrNull(fd.get("authorTitle")),
      authorBio: strOrNull(fd.get("authorBio")),
      status: status as "DRAFT" | "PUBLISHED",
      faq: parseFaq(fd.get("faq")),
      relatedProductIds: fd.getAll("relatedProductIds").map(String).filter(Boolean),
      relatedCategoryIds: fd.getAll("relatedCategoryIds").map(String).filter(Boolean),
      seoTitle: strOrNull(fd.get("seoTitle")),
      seoDescription: strOrNull(fd.get("seoDescription")),
      publishedAt,
      updatedAt: new Date(),
    };
    let pid = id;
    if (id) await db.update(posts).set(values).where(eq(posts.id, id));
    else pid = (await db.insert(posts).values(values).returning({ id: posts.id }))[0].id;
    await recordSlugChange("/blog", prev?.slug, slug);
    if (status === "PUBLISHED") await pingIndexNow([`/blog/${slug}`, "/blog"]);
    await audit(staff.id, id ? "update" : "create", "post", pid, `Yazı: ${title}`);
    revalidatePath("/", "layout");
    return ok(id ? "Yazı kaydedildi." : "Yazı oluşturuldu.", id ? {} : { redirect: `/admin/blog/${pid}` });
  });
}

export async function deletePost(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    await db.delete(posts).where(eq(posts.id, id));
    await audit(staff.id, "delete", "post", id, "Yazı silindi");
    revalidatePath("/", "layout");
    return ok("Yazı silindi.", { redirect: "/admin/blog" });
  });
}
