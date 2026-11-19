"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { aiProductContent } from "@/app/admin/(panel)/urunler/ai-actions";
import { Button, Card, CardHeader, Textarea } from "@/components/ui";
import type { AiProductParts, AiProductResult } from "@/lib/ai-product";

type Suggestion = { key: string; field: string; label: string; value: string; lang: "tr" | "en" };

const PARTS: { k: AiProductParts[number]; label: string; hint: string }[] = [
  { k: "tr", label: "Türkçe açıklama ve SEO", hint: "Kısa + detaylı açıklama, SEO başlığı ve açıklaması" },
  { k: "sales", label: "Kimler için ideal / Bunu bekleme", hint: "Dürüst satış maddeleri" },
  { k: "en", label: "İngilizce sürüm", hint: "Ad, adres (slug), açıklamalar ve SEO" },
];

/** React'in kontrol ettiği alanlarda da çalışan değer yazma (onChange tetiklenir) */
function setField(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || !("value" in el)) return false;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.closest("details")?.setAttribute("open", "");
  return true;
}

function readForm(form: HTMLFormElement) {
  const v = (n: string) => {
    const el = form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    return el && "value" in el ? String(el.value ?? "").trim() : "";
  };
  const text = (n: string) => {
    const el = form.elements.namedItem(n) as HTMLSelectElement | null;
    return el && el.value ? (el.selectedOptions?.[0]?.textContent ?? "").trim() : "";
  };
  let specs: { key: string; value: string }[] = [];
  try {
    specs = (JSON.parse(v("specs") || "[]") as { key: string; value: string }[]).filter((s) => s.key && s.value);
  } catch {
    /* boş */
  }
  return {
    name: v("name"),
    brand: text("brandId"),
    category: text("categoryId"),
    technology: text("technology"),
    waterproof: text("waterproof"),
    experience: text("experience"),
    weightKg: v("weightKg"),
    warrantyMonths: v("warrantyMonths"),
    specs,
    boxContents: v("boxContents"),
    shortDescription: v("shortDescription"),
    description: v("description"),
    idealFor: v("idealFor"),
    notFor: v("notFor"),
  };
}

function toSuggestions(r: AiProductResult): Suggestion[] {
  const out: Suggestion[] = [];
  const add = (field: string, label: string, value: string | undefined, lang: "tr" | "en" = "tr") => {
    if (value?.trim()) out.push({ key: `${lang}:${field}`, field, label, value: value.trim(), lang });
  };
  add("shortDescription", "Kısa açıklama", r.shortDescription);
  add("description", "Detaylı açıklama", r.description);
  add("seoTitle", "SEO başlığı", r.seoTitle);
  add("seoDescription", "SEO açıklaması", r.seoDescription);
  add("idealFor", "Kimler için ideal", r.idealFor?.join("\n"));
  add("notFor", "Bunu bekleme", r.notFor?.join("\n"));
  if (r.en) {
    add("tr_en_name", "İngilizce ad", r.en.name, "en");
    add("tr_en_slug", "İngilizce adres (slug)", r.en.slug, "en");
    add("tr_en_shortDescription", "İngilizce kısa açıklama", r.en.shortDescription, "en");
    add("tr_en_description", "İngilizce detaylı açıklama", r.en.description, "en");
    add("tr_en_seoTitle", "İngilizce SEO başlığı", r.en.seoTitle, "en");
    add("tr_en_seoDescription", "İngilizce SEO açıklaması", r.en.seoDescription, "en");
  }
  return out;
}

/** Ürün formunda: Claude ile içerik önerisi. Öneriler forma "uygula" ile yazılır, kayıt personelde kalır. */
export function AiContentPanel({ ready, canConfigure }: { ready: boolean; canConfigure: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [parts, setParts] = useState<AiProductParts>(["tr", "sales"]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<Suggestion[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const form = () => box.current?.closest("form") as HTMLFormElement | null;

  if (!ready)
    return (
      <Card data-testid="ai-panel">
        <div className="flex flex-wrap items-center gap-3 p-4 text-sm">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-soft"><Sparkles size={17} /></span>
          <span className="flex-1 text-mute">
            <b className="text-deep">Yapay zekâ ile içerik</b> — açıklama, SEO ve İngilizce sürümü tek tıkla yazdır.{" "}
            {canConfigure ? <Link href="/admin/ayarlar?t=yapay-zeka" className="font-bold text-link">Ayarlar → Yapay zekâ&apos;dan anahtar ekle</Link> : "Yönetici, Ayarlar → Yapay zekâ'dan anahtar eklemeli."}
          </span>
        </div>
      </Card>
    );

  const run = async () => {
    const f = form();
    if (!f) return;
    const input = readForm(f);
    if (!input.name) return toast.error("Önce ürün adını yaz.");
    setBusy(true);
    setList([]);
    setApplied(new Set());
    try {
      const r = await aiProductContent({ ...input, note: note.trim() || undefined }, parts);
      if (!r.ok) return toast.error(r.error);
      const s = toSuggestions(r.data);
      setList(s);
      if (!s.length) toast.error("Öneri çıkmadı, tekrar dene.");
    } catch {
      toast.error("İçerik oluşturulamadı. Biraz sonra tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  const apply = (items: Suggestion[]) => {
    const f = form();
    if (!f) return;
    const done = new Set(applied);
    let n = 0;
    for (const s of items) {
      if (!setField(f, s.field, s.value)) continue;
      done.add(s.key);
      n++;
    }
    setApplied(done);
    if (n) toast.success(`${n} alan forma yazıldı. Kontrol edip kaydetmeyi unutma.`);
    else toast.error("Alan formda bulunamadı.");
  };

  return (
    <Card data-testid="ai-panel">
      <CardHeader
        title={<span className="flex items-center gap-2"><Sparkles size={17} className="text-brand" /> Yapay zekâ ile içerik</span>}
        description="Formdaki bilgilerden (ad, marka, özellikler, kutu içeriği) öneri yazar; uydurma teknik bilgi eklemez. Öneriyi uygulayıp kontrol ettikten sonra kaydet."
      />
      <div className="flex flex-col gap-4 p-5 pt-0" ref={box}>
        <div className="grid gap-2 sm:grid-cols-3">
          {PARTS.map((p) => (
            <label key={p.k} className={`flex cursor-pointer gap-2 rounded-xl border p-3 text-sm ${parts.includes(p.k) ? "border-deep bg-soft" : "border-line"}`}>
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#1d1d1f]" checked={parts.includes(p.k)} onChange={(e) => setParts(e.target.checked ? [...parts, p.k] : parts.filter((x) => x !== p.k))} data-testid={`ai-part-${p.k}`} />
              <span><b className="block">{p.label}</b><span className="text-xs text-mute">{p.hint}</span></span>
            </label>
          ))}
        </div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="İsteğe bağlı not: öne çıkarmak istediğin noktalar, hedef müşteri, kullanım alanı… (ör. sahilde ve tarlada kullanılır, yeni başlayanlara uygun)" className="min-h-[60px]" data-testid="ai-note" />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={run} disabled={busy || !parts.length} data-testid="ai-run">
            {busy ? <><Loader2 size={16} className="animate-spin" /> Yazılıyor… (10–40 sn)</> : <><Sparkles size={16} /> {list.length ? "Yeniden oluştur" : "Öneri oluştur"}</>}
          </Button>
          {list.length ? (
            <Button type="button" variant="outline" onClick={() => apply(list)} data-testid="ai-apply-all">
              Tümünü forma uygula
            </Button>
          ) : null}
        </div>
        {list.length ? (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line" data-testid="ai-results">
            {list.map((s) => (
              <li key={s.key} className="flex flex-col gap-1.5 p-3" data-testid="ai-suggestion">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{s.label} {s.lang === "en" ? <span className="ml-1 rounded bg-soft px-1.5 py-0.5 text-[10px] font-bold">EN</span> : null}</b>
                  {applied.has(s.key) ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-ok"><Check size={14} /> Uygulandı</span>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => apply([s])}>Uygula</Button>
                  )}
                </div>
                <p className={`whitespace-pre-line text-[13px] text-mute ${open === s.key ? "" : "line-clamp-3"}`} lang={s.lang}>{s.value}</p>
                {s.value.length > 220 ? (
                  <button type="button" className="self-start text-xs font-bold text-link" onClick={() => setOpen(open === s.key ? null : s.key)}>{open === s.key ? "Daha az" : "Tamamını gör"}</button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Card>
  );
}
