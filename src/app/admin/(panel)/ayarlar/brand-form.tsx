"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Field, Input } from "@/components/ui";
import { brandPalette, contrast } from "@/lib/brand-color";
import type { BrandSettings } from "@/lib/settings";
import { saveBrand } from "./actions";

const PRESETS = ["#d42e1e", "#e8590c", "#c2410c", "#b7791f", "#15803d", "#0f766e", "#0369a1", "#1d4ed8", "#4338ca", "#7e22ce", "#be185d", "#1d1d1f"];

function ImageSlot({ name, label, hint, value, onChange, dark }: { name: string; label: string; hint: string; value: string; onChange: (v: string) => void; dark?: boolean }) {
  return (
    <div className="grid gap-2">
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-mute">{hint}</p>
      </div>
      <input type="hidden" name={name} value={value} />
      <ImageUploader single value={value ? [{ url: value }] : []} onChange={(v) => onChange(v[0]?.url ?? "")} />
      {value ? (
        <div className={`flex h-16 items-center justify-center rounded-lg border border-line px-4 ${dark ? "bg-[#141416]" : "bg-white"}`}>
          <img src={value} alt="" className="max-h-10 max-w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}

/** Ayarlar > Marka: logo, beyaz logo, ikon ve ana renk; canlı önizlemeyle */
export function BrandForm({ brand, storeName }: { brand: BrandSettings; storeName: string }) {
  const [logo, setLogo] = useState(brand.logoUrl);
  const [logoWhite, setLogoWhite] = useState(brand.logoWhiteUrl);
  const [icon, setIcon] = useState(brand.iconUrl);
  const [color, setColor] = useState(brand.color);
  const valid = /^#[0-9a-f]{6}$/i.test(color);
  const p = useMemo(() => brandPalette(valid ? color : "#d42e1e"), [color, valid]);
  const lowContrast = valid && contrast(color, "#ffffff") < 3;

  return (
    <ActionForm action={saveBrand} className="grid gap-6 p-5">
      <div className="grid gap-6 md:grid-cols-3">
        <ImageSlot name="logoUrl" label="Logo" hint="Açık zeminde (üst menü). Yatay, şeffaf arka planlı PNG/SVG önerilir. Boşsa mağaza adı yazı olarak görünür." value={logo} onChange={setLogo} />
        <ImageSlot name="logoWhiteUrl" label="Koyu zemin logosu" hint="Alt bilgi (footer) için beyaz sürüm. Boşsa logo otomatik beyaza çevrilir." value={logoWhite} onChange={setLogoWhite} dark />
        <ImageSlot name="iconUrl" label="Site ikonu" hint="Tarayıcı sekmesi ve telefona eklemede görünür. Kare, en az 512×512. Boşsa adın baş harfi kullanılır." value={icon} onChange={setIcon} />
      </div>

      <div className="grid gap-3">
        <Field label="Ana renk" hint="Butonlar, vurgular, bağlantılar ve fiyat etiketleri bu renkten türetilir.">
          <div className="flex flex-wrap items-center gap-2">
            <input type="color" value={valid ? color : "#d42e1e"} onChange={(e) => setColor(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" aria-label="Renk seç" />
            <Input name="color" value={color} onChange={(e) => setColor(e.target.value.trim())} className="w-32 font-mono" />
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} title={c} aria-label={c} className={`h-7 w-7 rounded-full border-2 ${c === color.toLowerCase() ? "border-deep" : "border-white shadow-[0_0_0_1px_#e5e5e5]"}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </Field>
        {lowContrast ? (
          <p className="rounded-lg bg-warn-bg p-3 text-sm font-semibold text-warn">Bu renk açık; beyaz zeminde yazılar için otomatik koyulaştırılmış tonu ({p.accent}) kullanılacak, buton yazıları koyu olacak.</p>
        ) : null}
      </div>

      {/* Canlı önizleme: kaydetmeden nasıl görüneceği */}
      <div className="overflow-hidden rounded-2xl border border-line" data-testid="brand-preview">
        <div className="flex items-center justify-between gap-4 border-b border-line bg-white px-5 py-4">
          {logo ? <img src={logo} alt="" className="h-9 max-w-[220px] object-contain" /> : <span className="font-display text-xl font-extrabold">{storeName}</span>}
          <span className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: p.brand, color: p.onBrand }}>Sepete ekle</span>
        </div>
        <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto]" style={{ background: p.tint }}>
          <div>
            <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ background: p.pop, color: p.onPop }}>Kampanya</span>
            <p className="mt-2 text-lg font-extrabold">Örnek ürün adı</p>
            <p className="text-sm" style={{ color: p.link }}>Ürün detayını gör →</p>
          </div>
          <p className="self-end text-2xl font-extrabold" style={{ color: p.accent }}>12.490 TL</p>
        </div>
        <div className="flex items-center justify-between gap-4 bg-[#141416] px-5 py-4">
          {logoWhite || logo ? <img src={logoWhite || logo} alt="" className={`h-8 max-w-[200px] object-contain ${logoWhite ? "" : "brightness-0 invert"}`} /> : <span className="font-display text-lg font-extrabold text-white">{storeName}</span>}
          <span className="text-xs text-white/60">Alt bilgi önizlemesi</span>
        </div>
      </div>

      <div>
        <SubmitButton>Kaydet</SubmitButton>
      </div>
    </ActionForm>
  );
}
