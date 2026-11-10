import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect } from "@/lib/redirects";

/** Eşleşmeyen her adres: önce yönlendirme tablosuna bak (301), yoksa 404. */
export default async function CatchAll({ params, searchParams }: { params: Promise<{ rest: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { rest } = await params;
  const sp = await searchParams;
  const path = "/" + rest.map((s) => decodeURIComponent(s)).join("/");
  // Eski sitenin arama adresi: /kategori?ara=minelab → /ara?q=minelab
  const q = sp.ara ?? sp.q ?? sp.search;
  if ((path === "/kategori" || path === "/arama") && typeof q === "string" && q.trim()) permanentRedirect(`/ara?q=${encodeURIComponent(q.trim())}`);
  const to = await findRedirect(path.replace(/\/$/, ""));
  if (to) permanentRedirect(to);
  notFound();
}
