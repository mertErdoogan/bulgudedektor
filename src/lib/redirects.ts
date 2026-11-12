import "server-only";
import { notFound, permanentRedirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notFoundLogs, redirects } from "@/db/schema";

/**
 * Slug değişince eski adresi 301 ile yenisine yönlendir — Google sıralaması ve
 * dış bağlantılar (sosyal medya, forumlar, AI cevaplarındaki linkler) kaybolmaz.
 */
export async function recordSlugChange(prefix: string, oldSlug: string | null | undefined, newSlug: string) {
  if (!oldSlug || oldSlug === newSlug) return;
  const from = `${prefix}/${oldSlug}`;
  const to = `${prefix}/${newSlug}`;
  // Zincirleri kır: eskiden "from"a gidenler artık doğrudan "to"ya gitsin
  await db.update(redirects).set({ toPath: to }).where(eq(redirects.toPath, from));
  // Yeni adres daha önce bir yönlendirmenin kaynağıysa (geri dönüş) onu kaldır
  await db.delete(redirects).where(eq(redirects.fromPath, to));
  await db.insert(redirects).values({ fromPath: from, toPath: to }).onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to } });
}

export async function findRedirect(path: string) {
  const r = await db.query.redirects.findFirst({ where: eq(redirects.fromPath, path) });
  if (r) await db.update(redirects).set({ hits: sql`${redirects.hits} + 1` }).where(eq(redirects.id, r.id));
  return r?.toPath ?? null;
}

/** Dinamik sayfalarda kayıt bulunamazsa: önce 301 yönlendirmesine bak, yoksa 404. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const to = await findRedirect(path);
  if (to) permanentRedirect(to);
  await log404(path).catch(() => {});
  return notFound();
}

// Tarayıcı botlarının denediği sistem/zafiyet adresleri kayda değmez
const JUNK = /\.(php|asp|aspx|jsp|cgi|env|sql|bak|ini|xml\.gz|zip)$|\/(wp-|wordpress|xmlrpc|cgi-bin|\.git|\.well-known|phpmyadmin|vendor\/)|\/(admin|api|_next)\//i;

/** 404 kaydı: aynı adres tek satırda sayılır. Admin → Yönlendirmeler'de en çok karşılaşılanlar listelenir. */
export async function log404(path: string) {
  const p = path.split("?")[0].slice(0, 300);
  if (p.length < 2 || JUNK.test(p)) return;
  const { headers } = await import("next/headers");
  let ref: string | null = null;
  try {
    const r = (await headers()).get("referer");
    if (r) ref = r.slice(0, 300);
  } catch {}
  await db
    .insert(notFoundLogs)
    .values({ path: p, referrer: ref })
    .onConflictDoUpdate({ target: notFoundLogs.path, set: { hits: sql`${notFoundLogs.hits} + 1`, lastAt: new Date(), ...(ref ? { referrer: ref } : {}) } });
}
