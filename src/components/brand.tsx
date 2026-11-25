"use client";

import { createContext, useContext } from "react";

/** Mağaza kimliği: kök layout ayarlardan doldurur; logo ve marka adı geçen her yer buradan okur */
export type Features = { wizard: boolean; glossary: boolean; serial: boolean; service: boolean; detectorSpecs: boolean };
export type Brand = { name: string; logoUrl: string; logoWhiteUrl: string; features: Features };

const NO_FEATURES: Features = { wizard: false, glossary: false, serial: false, service: false, detectorSpecs: false };
const Ctx = createContext<Brand>({ name: "", logoUrl: "", logoWhiteUrl: "", features: NO_FEATURES });

export function BrandProvider({ value, children }: { value: Brand; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBrand = () => useContext(Ctx);

/** Sektöre özel modüller (Ayarlar > Katalog): kapalı modülün bağlantıları gösterilmez */
export const useFeatures = () => useContext(Ctx).features;

/** İçeriği yalnızca ilgili modül açıksa gösterir (sunucu ve istemci bileşenlerinde kullanılabilir) */
export function IfFeature({ f, children, fallback = null }: { f: keyof Features; children: React.ReactNode; fallback?: React.ReactNode }) {
  return <>{useFeatures()[f] ? children : fallback}</>;
}
