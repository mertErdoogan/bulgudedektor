"use client";

import { createContext, useContext } from "react";

/** Mağaza kimliği: kök layout ayarlardan doldurur; logo ve marka adı geçen her yer buradan okur */
export type Brand = { name: string; logoUrl: string; logoWhiteUrl: string };

const Ctx = createContext<Brand>({ name: "", logoUrl: "", logoWhiteUrl: "" });

export function BrandProvider({ value, children }: { value: Brand; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBrand = () => useContext(Ctx);
