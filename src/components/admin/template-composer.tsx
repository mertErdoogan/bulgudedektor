"use client";

import { useMemo, useState } from "react";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { fillTemplate, missingVars, TEMPLATE_CATEGORIES } from "@/lib/templates";

type Tpl = { id: string; title: string; category: string; subject: string | null; body: string };

/** Hazır yanıt seçici: şablonu seçince alanlar dolar, metin düzenlenebilir; WhatsApp'ta aç, e-posta gönder veya kopyala. */
export function TemplateComposer({
  templates,
  vars,
  phone,
  action,
  hidden,
  canEmail,
  suggest,
}: {
  templates: Tpl[];
  vars: Record<string, string | undefined>;
  phone: string | null;
  /** Sunucu işlemi: body, subject, via (email|whatsapp|note) alır */
  action: Parameters<typeof ActionForm>[0]["action"];
  hidden: Record<string, string>;
  canEmail: boolean;
  /** Duruma göre önerilen kategori (ör. havale bekleyen siparişte "havale") */
  suggest?: string;
}) {
  const [tid, setTid] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [via, setVia] = useState("note");
  const left = useMemo(() => missingVars(body), [body]);
  const wa = phone?.replace(/\D/g, "").replace(/^0/, "90").replace(/^5/, "905");
  const sorted = useMemo(() => [...templates].sort((a, b) => Number(b.category === suggest) - Number(a.category === suggest)), [templates, suggest]);

  const pick = (id: string) => {
    setTid(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setBody(fillTemplate(t.body, vars));
    setSubject(fillTemplate(t.subject ?? "", vars));
  };

  return (
    <ActionForm action={action} resetOnSuccess className="flex flex-col gap-2" onDone={() => { setBody(""); setTid(""); setVia("note"); }}>
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="subject" value={subject} />
      <select aria-label="Hazır yanıt seç" value={tid} onChange={(e) => pick(e.target.value)} className="h-9 rounded-lg border border-line bg-white px-2 text-sm">
        <option value="">Hazır yanıt seç…</option>
        {Object.entries(TEMPLATE_CATEGORIES).map(([cat, label]) => {
          const list = sorted.filter((t) => t.category === cat);
          return list.length ? (
            <optgroup key={cat} label={`${label}${cat === suggest ? " (önerilen)" : ""}`}>
              {list.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={body ? 7 : 3}
        placeholder="Mesajı yaz ya da yukarıdan hazır yanıt seç"
        className="rounded-lg border border-line px-3 py-2 text-sm"
        required
      />
      {left.length ? <p className="text-xs font-semibold text-warn">Doldurulamayan alan: {left.map((v) => `{${v}}`).join(", ")} — metinde düzeltin.</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {wa ? (
          <a
            href={body && !left.length ? `https://wa.me/${wa}?text=${encodeURIComponent(body)}` : undefined}
            target="_blank"
            aria-disabled={!body || !!left.length}
            onClick={(e) => {
              if (!body || left.length) e.preventDefault();
              else setVia("whatsapp");
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-white ${body && !left.length ? "bg-[#1f9d55]" : "bg-mute/50"}`}
          >
            <MessageCircle size={15} /> WhatsApp&apos;ta aç
          </a>
        ) : null}
        <button
          type="button"
          disabled={!body}
          onClick={() => navigator.clipboard.writeText(body).then(() => toast.success("Kopyalandı"))}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold disabled:opacity-50"
        >
          <Copy size={14} /> Kopyala
        </button>
        <span className="ml-auto flex gap-2">
          <SubmitButton size="sm" variant="outline" name="via" value={via === "whatsapp" ? "whatsapp" : "note"}>
            Geçmişe kaydet
          </SubmitButton>
          {canEmail ? (
            <SubmitButton size="sm" name="via" value="email">
              <Mail size={14} /> E-posta gönder
            </SubmitButton>
          ) : null}
        </span>
      </div>
      <label className="flex items-center gap-2 text-xs text-mute">
        <input type="checkbox" name="public" defaultChecked className="accent-brand" /> Müşterinin sipariş takip sayfasında da göster
      </label>
      <p className="text-[11px] text-mute">WhatsApp&apos;ta gönderdikten sonra &quot;Geçmişe kaydet&quot; ile sipariş geçmişine not düşebilirsin.</p>
    </ActionForm>
  );
}

/** Mevcut bir formdaki metin kutusuna şablon ekler (ör. mesajlar ekranındaki yanıt kutusu). */
export function TemplateInsert({ templates, vars, target = "body" }: { templates: Tpl[]; vars: Record<string, string | undefined>; target?: string }) {
  return (
    <select
      aria-label="Hazır yanıt ekle"
      defaultValue=""
      onChange={(e) => {
        const t = templates.find((x) => x.id === e.target.value);
        const ta = e.currentTarget.form?.elements.namedItem(target) as HTMLTextAreaElement | null;
        if (t && ta) {
          const text = fillTemplate(t.body, vars);
          ta.value = ta.value.trim() ? `${ta.value.trim()}\n\n${text}` : text;
          ta.focus();
          if (missingVars(text).length) toast.warning(`Doldurulamayan alan: ${missingVars(text).map((v) => `{${v}}`).join(", ")}`);
        }
        e.currentTarget.value = "";
      }}
      className="h-9 max-w-full rounded-lg border border-line bg-white px-2 text-sm"
    >
      <option value="">Hazır yanıt ekle…</option>
      {Object.entries(TEMPLATE_CATEGORIES).map(([cat, label]) => {
        const list = templates.filter((t) => t.category === cat);
        return list.length ? (
          <optgroup key={cat} label={label}>
            {list.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </optgroup>
        ) : null;
      })}
    </select>
  );
}
