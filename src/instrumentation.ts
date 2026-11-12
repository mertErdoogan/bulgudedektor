/**
 * Sunucu hatalarını yakalama. ERROR_WEBHOOK_URL tanımlıysa (Slack, Discord veya Telegram bot webhook'u)
 * her sunucu hatası kısa bir mesajla oraya gönderilir. Ayrıca "ayarlar" yetkili personelin panel bildirimlerine düşer. Sentry kullanmak isterseniz @sentry/nextjs eklenebilir.
 */
export async function register() {}

const recent = new Map<string, number>();

export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routeType: string }) {
  const url = process.env.ERROR_WEBHOOK_URL;
  const e = err as Error & { digest?: string };
  console.error(`[hata] ${request.method} ${request.path}`, e?.message);
  const key = `${request.path}:${e?.message}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - 10 * 60_000) return; // aynı hatayı 10 dk'da bir kez bildir
  recent.set(key, now);
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { notifyStaff } = await import("./lib/notify");
      await notifyStaff({ perm: "settings.manage", kind: "error", title: `Sunucu hatası: ${request.method} ${request.path}`.slice(0, 160), body: `${e?.name ?? "Error"}: ${e?.message ?? String(err)}`.slice(0, 300) });
    } catch {}
  }
  if (!url) return;
  const text = `🚨 ${process.env.APP_URL ?? ""} ${request.method} ${request.path}\n${e?.name ?? "Error"}: ${e?.message ?? String(err)}\n(${context.routeType}${e?.digest ? `, digest ${e.digest}` : ""})`;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, content: text }), signal: AbortSignal.timeout(4000) });
  } catch {}
}
