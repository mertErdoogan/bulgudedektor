import { notFound, permanentRedirect } from "next/navigation";
import { findRedirect } from "@/lib/redirects";

/** Eşleşmeyen her adres: önce yönlendirme tablosuna bak (301), yoksa 404. */
export default async function CatchAll({ params }: { params: Promise<{ rest: string[] }> }) {
  const { rest } = await params;
  const path = "/" + rest.map((s) => decodeURIComponent(s)).join("/");
  const to = await findRedirect(path.replace(/\/$/, ""));
  if (to) permanentRedirect(to);
  notFound();
}
