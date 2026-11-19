import "server-only";
import { getSettings } from "./settings";

/** Panelde seçilebilen Claude modelleri */
export const AI_MODELS: { id: string; label: string }[] = [
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (önerilen: kalite/fiyat dengesi)" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (en hızlı, en ucuz)" },
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 (en iyi yazım, daha pahalı)" },
];

export class AiError extends Error {}

export async function aiConfig() {
  const s = await getSettings();
  const apiKey = s.ai.apiKey || process.env.ANTHROPIC_API_KEY || "";
  return { apiKey, model: s.ai.model || AI_MODELS[0].id, ready: !!apiKey };
}

type Tool = { name: string; description: string; input_schema: Record<string, unknown> };

/**
 * Claude'a tek mesaj gönderir ve yapılandırılmış sonucu (araç girdisi) döner.
 * Araç kullanımı zorunlu tutulur; böylece cevap her zaman şemaya uygun JSON olur.
 */
export async function aiStructured<T>(o: { system: string; prompt: string; tool: Tool; maxTokens?: number }): Promise<T> {
  const c = await aiConfig();
  if (!c.ready) throw new AiError("Yapay zekâ anahtarı girilmemiş. Ayarlar → Yapay zekâ bölümünden Anthropic API anahtarını ekle.");
  const base = (process.env.AI_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  let res: Response;
  try {
    res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: c.model,
        max_tokens: o.maxTokens ?? 4000,
        system: o.system,
        tools: [o.tool],
        tool_choice: { type: "tool", name: o.tool.name },
        messages: [{ role: "user", content: o.prompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    throw new AiError("Yapay zekâ servisine ulaşılamadı (zaman aşımı). Biraz sonra tekrar dene.");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) throw new AiError("API anahtarı geçersiz ya da yetkisiz. Ayarlar → Yapay zekâ'dan kontrol et.");
    if (res.status === 429) throw new AiError("Yapay zekâ kullanım sınırına ulaşıldı. Birkaç dakika sonra tekrar dene.");
    if (res.status === 529 || res.status >= 500) throw new AiError("Yapay zekâ servisi şu an yoğun. Biraz sonra tekrar dene.");
    if (res.status === 404 || /model/i.test(body)) throw new AiError("Seçili model kullanılamıyor. Ayarlar → Yapay zekâ'dan başka bir model seç.");
    throw new AiError(`Yapay zekâ isteği başarısız (${res.status}).`);
  }
  const data = (await res.json()) as { content?: { type: string; name?: string; input?: unknown }[]; stop_reason?: string };
  const block = data.content?.find((b) => b.type === "tool_use" && b.name === o.tool.name);
  if (!block?.input) throw new AiError(data.stop_reason === "max_tokens" ? "Cevap çok uzun kesildi; daha az alan seçip tekrar dene." : "Yapay zekâ beklenen biçimde cevap vermedi. Tekrar dene.");
  return block.input as T;
}

/** Ayarlardaki "Bağlantıyı test et" düğmesi */
export async function aiPing() {
  const r = await aiStructured<{ ok: boolean }>({
    system: "Sadece test.",
    prompt: "Bağlantı testi: ok alanını true yap.",
    tool: { name: "ping", description: "Bağlantı testi", input_schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] } },
    maxTokens: 50,
  });
  return r.ok === true;
}
