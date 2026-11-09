"use server";

import { and, asc, eq, gt, lt, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { banners, homeSections, mediaAssets, menuItems, pages } from "@/db/schema";
import { fail, ok, safe, type ActionResult } from "@/lib/action";
import { audit } from "@/lib/audit";
import { assertStaff } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import { deleteUpload } from "@/lib/storage";
import { slugify, str, strOrNull, toNum } from "@/lib/utils";

const done = (msg: string, redirect?: string) => {
  revalidatePath("/", "layout");
  return ok(msg, redirect ? { redirect } : {});
};

export async function saveBanner(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = strOrNull(fd.get("id"));
    const imageUrl = str(fd.get("imageUrl"));
    const title = str(fd.get("title"));
    if (!title) return fail("Başlık zorunlu (görselde yazmasa da erişilebilirlik ve SEO için).");
    if (!imageUrl) return fail("Görsel yükleyin.");
    const s = strOrNull(fd.get("startsAt"));
    const e = strOrNull(fd.get("endsAt"));
    const values = {
      title,
      subtitle: strOrNull(fd.get("subtitle")),
      eyebrow: strOrNull(fd.get("eyebrow")),
      ctaLabel: strOrNull(fd.get("ctaLabel")),
      imageUrl,
      mobileImageUrl: strOrNull(fd.get("mobileImageUrl")),
      linkUrl: strOrNull(fd.get("linkUrl")),
      placement: str(fd.get("placement")) as "HERO",
      sortOrder: toNum(fd.get("sortOrder"), 0),
      isActive: fd.get("isActive") === "on",
      showText: fd.get("showText") === "on",
      startsAt: s ? new Date(s) : null,
      endsAt: e ? new Date(e) : null,
    };
    if (id) await db.update(banners).set(values).where(eq(banners.id, id));
    else await db.insert(banners).values(values);
    await audit(staff.id, id ? "update" : "create", "banner", id, `Banner: ${title}`);
    return done("Banner kaydedildi.", "/admin/vitrin");
  });
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    await db.delete(banners).where(eq(banners.id, id));
    await audit(staff.id, "delete", "banner", id, "Banner silindi");
    return done("Banner silindi.", "/admin/vitrin");
  });
}

export async function saveSection(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = str(fd.get("id"));
    const limit = toNum(fd.get("limit"), 0);
    const sec = await db.query.homeSections.findFirst({ where: eq(homeSections.id, id) });
    if (!sec) return fail("Bölüm bulunamadı.");
    await db
      .update(homeSections)
      .set({ title: strOrNull(fd.get("title")), subtitle: strOrNull(fd.get("subtitle")), isActive: fd.get("isActive") === "on", config: limit ? { ...sec.config, limit } : sec.config })
      .where(eq(homeSections.id, id));
    await audit(staff.id, "update", "home_section", id, `Ana sayfa bölümü: ${sec.type}`);
    return done("Bölüm kaydedildi.");
  });
}

export async function moveSection(id: string, dir: -1 | 1): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("cms.manage");
    const cur = await db.query.homeSections.findFirst({ where: eq(homeSections.id, id) });
    if (!cur) return fail("Bulunamadı.");
    const other = await db.query.homeSections.findFirst({
      where: dir < 0 ? lt(homeSections.sortOrder, cur.sortOrder) : gt(homeSections.sortOrder, cur.sortOrder),
      orderBy: dir < 0 ? desc(homeSections.sortOrder) : asc(homeSections.sortOrder),
    });
    if (!other) return ok();
    await db.update(homeSections).set({ sortOrder: other.sortOrder }).where(eq(homeSections.id, cur.id));
    await db.update(homeSections).set({ sortOrder: cur.sortOrder }).where(eq(homeSections.id, other.id));
    return done("Sıra değişti.");
  });
}

export async function saveAnnouncement(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    await saveSettings("store", { announcement: str(fd.get("announcement")) });
    await audit(staff.id, "settings", "store", null, "Duyuru şeridi güncellendi");
    return done("Duyuru şeridi kaydedildi.");
  });
}

export async function savePage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = strOrNull(fd.get("id"));
    const title = str(fd.get("title"));
    if (!title) return fail("Başlık zorunlu.");
    const slug = slugify(str(fd.get("slug")) || title);
    const dupe = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
    if (dupe && dupe.id !== id) return fail("Bu URL başka bir sayfada kullanılıyor.");
    const values = {
      title,
      slug,
      content: str(fd.get("content")),
      isPublished: fd.get("isPublished") === "on",
      showInFooter: fd.get("showInFooter") === "on",
      footerGroup: str(fd.get("footerGroup")) || "Sözleşmeler",
      seoDescription: strOrNull(fd.get("seoDescription")),
    };
    if (id) await db.update(pages).set(values).where(eq(pages.id, id));
    else await db.insert(pages).values(values);
    await audit(staff.id, id ? "update" : "create", "page", id, `Sayfa: ${title}`);
    return done("Sayfa kaydedildi.", "/admin/sayfalar");
  });
}

export async function deletePage(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const p = await db.query.pages.findFirst({ where: eq(pages.id, id) });
    if (p && ["mesafeli-satis-sozlesmesi", "on-bilgilendirme-formu", "kvkk-aydinlatma-metni"].includes(p.slug)) return fail("Yasal zorunlu sayfa silinemez; içeriğini düzenleyin.");
    await db.delete(pages).where(eq(pages.id, id));
    await audit(staff.id, "delete", "page", id, "Sayfa silindi");
    return done("Sayfa silindi.", "/admin/sayfalar");
  });
}

export async function saveMenuItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const id = strOrNull(fd.get("id"));
    const label = str(fd.get("label"));
    const url = str(fd.get("url"));
    if (!label || !url) return fail("Etiket ve bağlantı zorunlu.");
    const values = { label, url, location: str(fd.get("location")) || "HEADER", sortOrder: toNum(fd.get("sortOrder"), 0), isActive: fd.get("isActive") === "on", highlight: fd.get("highlight") === "on" };
    if (id) await db.update(menuItems).set(values).where(eq(menuItems.id, id));
    else await db.insert(menuItems).values(values);
    await audit(staff.id, "update", "menu", id, `Menü: ${label}`);
    return done("Menü öğesi kaydedildi.", "/admin/menuler");
  });
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  return safe(async () => {
    await assertStaff("cms.manage");
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return done("Silindi.", "/admin/menuler");
  });
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  return safe(async () => {
    const staff = await assertStaff("cms.manage");
    const m = await db.query.mediaAssets.findFirst({ where: and(eq(mediaAssets.id, id)) });
    if (!m) return fail("Bulunamadı.");
    await deleteUpload(m.url);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    await audit(staff.id, "delete", "media", id, `Medya silindi: ${m.filename}`);
    return ok("Dosya silindi. Kullanıldığı yerlerde görsel kırık görünebilir.");
  });
}
