"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, Input } from "@/components/ui";

export type Img = { url: string; alt?: string | null };

export async function uploadFiles(files: FileList | File[]): Promise<string[]> {
  const fd = new FormData();
  for (const f of Array.from(files)) fd.append("file", f);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Yükleme başarısız");
  return (json.files as { url: string }[]).map((f) => f.url);
}

export function ImageUploader({ value, onChange, single }: { value: Img[]; onChange: (v: Img[]) => void; single?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState("");

  async function handle(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const urls = await uploadFiles(single ? [files[0]] : files);
      onChange(single ? [{ url: urls[0] }] : [...value, ...urls.map((u) => ({ url: u }))]);
      toast.success(`${urls.length} görsel yüklendi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yükleme başarısız");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const copy = [...value];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    onChange(copy);
  };

  return (
    <div className="flex flex-col gap-3">
      {value.length ? (
        <div className={cn("grid gap-3", single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4")}>
          {value.map((im, i) => (
            <div key={im.url + i} className="rounded-xl border border-line bg-white p-2">
              <div className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={im.alt ?? ""} className="h-full w-full object-contain" />
                {i === 0 && !single ? <span className="absolute top-1.5 left-1.5 rounded bg-deep px-1.5 py-0.5 text-[10px] font-bold text-white">KAPAK</span> : null}
              </div>
              <Input
                value={im.alt ?? ""}
                onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))}
                placeholder="Alternatif metin"
                className="mt-2 h-8 text-xs"
              />
              <div className="mt-1.5 flex justify-between">
                {!single ? (
                  <div className="flex">
                    <button type="button" className="rounded p-1.5 hover:bg-soft disabled:opacity-30" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Sola taşı">
                      <ArrowLeft size={14} />
                    </button>
                    <button type="button" className="rounded p-1.5 hover:bg-soft disabled:opacity-30" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Sağa taşı">
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ) : (
                  <span />
                )}
                <button type="button" className="rounded p-1.5 text-danger hover:bg-danger-bg" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Görseli kaldır">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {!single || value.length === 0 ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handle(e.dataTransfer.files);
          }}
          onClick={() => input.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#d5d8de] px-4 py-8 text-center text-sm text-mute hover:border-brand hover:bg-tint/50",
            drag && "border-brand bg-tint",
          )}
        >
          <ImagePlus size={26} />
          <span>
            <b className="text-deep">{busy ? "Yükleniyor…" : "Görsel seç"}</b> veya buraya sürükle
          </span>
          <span className="text-xs">JPG, PNG, WEBP · en fazla 8 MB · beyaz zemin önerilir</span>
          <input ref={input} type="file" accept="image/*" multiple={!single} hidden onChange={(e) => handle(e.target.files)} />
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="veya görsel adresi yapıştır (https://… ya da /media/…)" className="h-9 text-sm" />
        <Button
          type="button"
          variant="soft"
          size="sm"
          className="h-9"
          onClick={() => {
            if (!url.trim()) return;
            onChange(single ? [{ url: url.trim() }] : [...value, { url: url.trim() }]);
            setUrl("");
          }}
        >
          <Link2 size={14} /> Ekle
        </Button>
      </div>
    </div>
  );
}
