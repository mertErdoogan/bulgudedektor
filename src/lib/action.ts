export type ActionResult = { ok: boolean; message?: string; error?: string; redirect?: string; data?: unknown };

export const ok = (message?: string, extra: Partial<ActionResult> = {}): ActionResult => ({ ok: true, message, ...extra });
export const fail = (error: string): ActionResult => ({ ok: false, error });

/** Server action gövdesini sarar: beklenmeyen hataları kullanıcıya okunur mesaj olarak döndürür. */
export async function safe(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  return toLocale(await safeInner(fn));
}

/** İngilizce sayfadan gelen istekte bilinen mağaza mesajlarını çevirir */
async function toLocale(r: ActionResult): Promise<ActionResult> {
  if (!r.message && !r.error) return r;
  const { getLocale } = await import("./i18n/server");
  if ((await getLocale()) !== "en") return r;
  const { messageToEnglish } = await import("./i18n/action-messages");
  return { ...r, message: messageToEnglish(r.message), error: messageToEnglish(r.error) };
}

async function safeInner(fn: () => Promise<ActionResult>): Promise<ActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    const msg = e instanceof Error ? e.message : "Beklenmeyen bir hata oluştu.";
    if (/duplicate key|unique constraint/i.test(msg)) return fail("Bu değer zaten kullanılıyor (benzersiz olmalı). Lütfen değiştirin.");
    if (/foreign key/i.test(msg)) return fail("Bu kayıt başka kayıtlarla ilişkili olduğu için işlem yapılamadı.");
    console.error(e);
    return fail(msg);
  }
}
