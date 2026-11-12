import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

/**
 * Varsayılan paylaşım görseli (1200×630). Kendi og:image'i olmayan sayfalar (yasal sayfalar, SSS, iletişim…)
 * WhatsApp/Facebook/X'te paylaşılınca boş kart yerine bu görünür. Ayarlar → SEO'da görsel yüklenirse o kullanılır.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Türkçe karakterler (ğ, ş, ı…) için yazı tipi yerelden yüklenir; yoksa Google Fonts'tan indirilmeye çalışılır
const DIR = path.join(process.cwd(), "node_modules/@fontsource/public-sans/files");
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 800; style: "normal" }[]> | null = null;
const loadFonts = () =>
  (fonts ??= Promise.all(
    (["latin", "latin-ext"] as const).flatMap((sub) =>
      ([400, 800] as const).map(async (weight) => ({ name: sub === "latin" ? "Public Sans" : "Public Sans Ext", data: await readFile(path.join(DIR, `public-sans-${sub}-${weight}-normal.woff`)), weight, style: "normal" as const })),
    ),
  ));

export async function GET() {
  const s = await getSettings();
  const name = s.store.name || "Mağaza";
  const d = (s.seo.description || "").trim();
  const line = d.length > 120 ? `${d.slice(0, 118).replace(/\s+\S*$/, "")}…` : d;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#141416", color: "#fff", padding: "72px 80px", fontFamily: "Public Sans, Public Sans Ext" }}>
        <div style={{ display: "flex", width: 120, height: 10, background: "#d42e1e", borderRadius: 6 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -2 }}>{name}</div>
          {line ? <div style={{ marginTop: 24, fontSize: 34, color: "#c9c9cf", lineHeight: 1.3 }}>{line}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#9a9aa2" }}>{(process.env.APP_URL || "").replace(/^https?:\/\//, "")}</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } },
  );
}
