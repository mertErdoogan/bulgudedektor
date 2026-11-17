"use client";

import { useRef, useState, useTransition } from "react";
import { Eye, FileText, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Sayfa içeriği düzenleyici: "Yaz" (Markdown) ve "Önizle" (sitede görüneceği hal) sekmeleri.
 * Eski HTML içerik bozulmadan çalışmaya devam eder; basit HTML tek tıkla sade yazıya (Markdown) çevrilebilir.
 */
export function ContentEditor({ name, defaultValue, preview }: { name: string; defaultValue?: string; preview: (content: string) => Promise<string> }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [pending, start] = useTransition();
  const [isHtml, setIsHtml] = useState((defaultValue ?? "").trim().startsWith("<"));
  const [complex, setComplex] = useState(() => hasComplexHtml(defaultValue ?? ""));

  const showPreview = () => {
    setTab("preview");
    start(async () => setHtml(await preview(ref.current?.value ?? "")));
  };
  const convert = () => {
    const el = ref.current;
    if (!el) return;
    if (!window.confirm("İçerik sade yazıya (Markdown) çevrilsin mi? Kaydetmeden önce önizlemeden kontrol edebilirsin; kaydetmezsen hiçbir şey değişmez.")) return;
    el.value = htmlToMarkdown(el.value);
    setIsHtml(false);
    setComplex(false);
  };

  return (
    <div className="rounded-xl border border-line" data-testid="content-editor">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-soft px-2 py-1.5">
        <Tab on={tab === "write"} onClick={() => setTab("write")} icon={<FileText size={14} />}>Yaz</Tab>
        <Tab on={tab === "preview"} onClick={showPreview} icon={<Eye size={14} />} testId="content-preview-tab">Önizle</Tab>
        {isHtml && tab === "write" ? (
          complex ? (
            <span className="ml-auto text-xs text-mute">HTML içerik (tablo/görsel var): olduğu gibi düzenlenir, önizlemeden kontrol et.</span>
          ) : (
            <button type="button" onClick={convert} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-link hover:bg-white" data-testid="content-convert">
              <Wand2 size={14} /> Sade yazıya çevir
            </button>
          )
        ) : null}
      </div>
      <textarea
        ref={ref}
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => setIsHtml(e.target.value.trim().startsWith("<"))}
        className={cn("block min-h-[380px] w-full resize-y rounded-b-xl bg-white p-3 font-mono text-[13px] outline-none", tab === "preview" && "hidden")}
      />
      {tab === "preview" ? (
        <div className="min-h-[380px] rounded-b-xl bg-white p-5" data-testid="content-preview">
          {pending ? <p className="text-sm text-mute">Hazırlanıyor…</p> : <div className="prose-lite" dangerouslySetInnerHTML={{ __html: html || "<p><em>İçerik boş.</em></p>" }} />}
        </div>
      ) : null}
    </div>
  );
}

function Tab({ on, onClick, icon, children, testId }: { on: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode; testId?: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId} className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-sm font-semibold", on ? "bg-white shadow-sm" : "text-mute hover:text-ink")}>
      {icon}
      {children}
    </button>
  );
}

const hasComplexHtml = (s: string) => /<(table|img|iframe|details|figure|pre|blockquote)\b/i.test(s);

/** Basit HTML → Markdown (başlık, paragraf, kalın/italik, bağlantı, liste). Yalnız tarayıcıda çalışır. */
function htmlToMarkdown(src: string): string {
  const doc = new DOMParser().parseFromString(`<div>${src}</div>`, "text/html");
  const inline = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? "").replace(/\s+/g, " ");
    if (!(n instanceof HTMLElement)) return "";
    const inner = Array.from(n.childNodes).map(inline).join("");
    switch (n.tagName) {
      case "STRONG":
      case "B":
        return inner.trim() ? `**${inner.trim()}**` : "";
      case "EM":
      case "I":
        return inner.trim() ? `*${inner.trim()}*` : "";
      case "A":
        return n.getAttribute("href") ? `[${inner.trim()}](${n.getAttribute("href")})` : inner;
      case "BR":
        return "\n";
      default:
        return inner;
    }
  };
  const out: string[] = [];
  const block = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? "").trim();
      if (t) out.push(t);
      return;
    }
    if (!(n instanceof HTMLElement)) return;
    const tag = n.tagName;
    if (/^H[1-6]$/.test(tag)) out.push(`${tag === "H1" || tag === "H2" ? "##" : "###"} ${inline(n).trim()}`);
    else if (tag === "P") {
      const t = inline(n).trim();
      if (t) out.push(t);
    } else if (tag === "UL" || tag === "OL") {
      out.push(
        Array.from(n.children)
          .filter((li) => li.tagName === "LI")
          .map((li, i) => `${tag === "OL" ? `${i + 1}.` : "-"} ${inline(li).trim()}`)
          .join("\n"),
      );
    } else if (tag === "HR") return;
    else if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE" || tag === "SPAN") Array.from(n.childNodes).forEach(block);
    else {
      const t = inline(n).trim();
      if (t) out.push(t);
    }
  };
  Array.from(doc.body.firstElementChild?.childNodes ?? []).forEach(block);
  return out.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
