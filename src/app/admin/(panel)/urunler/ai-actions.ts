"use server";

import { AiError } from "@/lib/ai";
import { generateProductContent, type AiProductInput, type AiProductParts, type AiProductResult } from "@/lib/ai-product";
import { assertStaff } from "@/lib/auth";
import { allow } from "@/lib/guard";

export type AiProductResponse = { ok: true; data: AiProductResult } | { ok: false; error: string };

export async function aiProductContent(input: AiProductInput, parts: AiProductParts): Promise<AiProductResponse> {
  let staff;
  try {
    staff = await assertStaff("products.edit");
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!input?.name?.trim()) return { ok: false, error: "Önce ürün adını yaz." };
  const ps = (parts ?? []).filter((x): x is AiProductParts[number] => ["tr", "sales", "en"].includes(x));
  if (!ps.length) return { ok: false, error: "En az bir içerik türü seç." };
  if (!(await allow(`ai:${staff.id}`, 40, 60 * 60 * 1000))) return { ok: false, error: "Saatlik yapay zekâ kullanım sınırına ulaştın (40). Biraz sonra tekrar dene." };
  // Aşırı uzun girdiyi kırp (maliyet ve süre)
  const clip = (s?: string, n = 4000) => (s ? s.slice(0, n) : s);
  const safeInput: AiProductInput = {
    ...input,
    name: input.name.slice(0, 200),
    description: clip(input.description, 6000),
    note: clip(input.note, 1500),
    specs: (input.specs ?? []).slice(0, 40).map((s) => ({ key: String(s.key).slice(0, 80), value: String(s.value).slice(0, 200) })),
  };
  try {
    return { ok: true, data: await generateProductContent(safeInput, ps) };
  } catch (e) {
    if (e instanceof AiError) return { ok: false, error: e.message };
    console.error("ai product content", e);
    return { ok: false, error: "İçerik oluşturulamadı. Biraz sonra tekrar dene." };
  }
}
