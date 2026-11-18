"use client";

import { useEffect, useRef, useState } from "react";
import { imgUrl } from "@/lib/img";

/**
 * Ana banner'ın altındaki sekme şeridinin rengi. Varsayılan "Otomatik": görselin alt kenarından alınır, böylece
 * görsel şeride akar. Önizleme formdaki güncel görselden (kaydetmeden) tarayıcıda hesaplanır; sunucu da kayıtta
 * aynı kuralla hesaplar. Beğenilmezse "Elle seç".
 */
export function BannerStageField({ defaultColor, autoColor }: { defaultColor?: string | null; autoColor?: string | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"auto" | "manual">(defaultColor ? "manual" : "auto");
  const [manual, setManual] = useState(defaultColor || autoColor || "#f1efec");
  const [src, setSrc] = useState("");
  const [auto, setAuto] = useState(autoColor || "");

  // Görsel alanı gizli bir input; değeri değişince (yeni yükleme) önizlemeyi güncelle
  useEffect(() => {
    const form = box.current?.closest("form");
    const read = () => (form?.querySelector<HTMLInputElement>('input[name="imageUrl"]')?.value ?? "");
    setSrc(read());
    const t = window.setInterval(() => setSrc((cur) => (read() !== cur ? read() : cur)), 700);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!src) return;
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => {
      try {
        const W = 64;
        const H = 24;
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const g = c.getContext("2d");
        if (!g) return;
        g.drawImage(im, 0, 0, W, H);
        const d = g.getImageData(0, H - 2, W, 2).data;
        const ch: number[][] = [[], [], []];
        for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
        const med = (v: number[]) => v.sort((a, b) => a - b)[v.length >> 1];
        setAuto(`#${ch.map((v) => med(v).toString(16).padStart(2, "0")).join("")}`);
      } catch {
        /* farklı alan adındaki görsel okunamazsa kayıtta sunucu hesaplar */
      }
    };
    im.src = imgUrl(src, 640);
  }, [src]);

  const color = mode === "manual" ? manual : auto || "#f1efec";
  const dark = lum(color) < 0.5;
  return (
    <div ref={box} className="flex flex-col gap-2" data-testid="stage-field">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="stageMode" value="auto" checked={mode === "auto"} onChange={() => setMode("auto")} /> Otomatik (görselden)
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" name="stageMode" value="manual" checked={mode === "manual"} onChange={() => setMode("manual")} /> Elle seç
        </label>
        <input type="color" name="stageColor" value={manual} onChange={(e) => { setManual(e.target.value); setMode("manual"); }} aria-label="Şerit rengi" className="h-8 w-12 cursor-pointer rounded border border-line" />
      </div>
      {src ? (
        <div className="overflow-hidden rounded-xl border border-line" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl(src, 640)} alt="" className="block aspect-[1520/580] w-full object-cover" />
          <div className="flex h-9 items-center gap-3 px-3 text-xs font-bold" style={{ background: color, color: dark ? "#fff" : "#1d1d1f" }}>
            <span className="h-[3px] w-10 rounded" style={{ background: dark ? "#fff" : "#d42e1e" }} /> Sekme şeridi önizlemesi
          </div>
        </div>
      ) : null}
    </div>
  );
}

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
