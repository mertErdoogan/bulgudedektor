import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";
import { brandPalette } from "@/lib/brand-color";

/* İkon yüklenmemişse: mağaza adının baş harfi, ana renkte yuvarlatılmış kare (sekme ikonu ve ana ekran) */
export async function GET() {
  const s = await getSettings();
  const p = brandPalette(s.brand.color);
  const letter = (s.store.name.trim()[0] || "M").toLocaleUpperCase("tr-TR");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: p.brand, borderRadius: 112, color: p.onBrand, fontSize: 330, fontWeight: 800 }}>
        {letter}
      </div>
    ),
    { width: 512, height: 512, headers: { "Cache-Control": "public, max-age=300" } },
  );
}
