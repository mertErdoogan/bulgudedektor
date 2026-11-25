/** Beyaz etiket yardımcıları: renk paleti, ürün türü yer tutucuları, çok boyutlu varyantlar, kapalı modül linkleri.
 *  Çalıştırma: npx tsx tests/unit/white-label.test.ts */
import assert from "node:assert/strict";
import { brandCss, brandPalette, contrast } from "../../src/lib/brand-color";
import { fillNiche, setNiche, translate } from "../../src/lib/i18n/dict";
import { linkAllowed } from "../../src/lib/nav-links";
import { parseVariantLabel, variantAxes, type VariantRow } from "../../src/lib/variants";

// Renk: türetilen yazı tonları beyaz zeminde okunur (WCAG AA), varsayılan kırmızıda ek CSS yok
for (const c of ["#d42e1e", "#0369a1", "#facc15", "#22c55e", "#ffffff", "#000000"]) {
  const p = brandPalette(c);
  assert.ok(contrast(p.accent, "#ffffff") >= 4.5, `${c} accent okunur`);
  assert.ok(contrast(p.link, "#ffffff") >= 4.5, `${c} link okunur`);
  assert.ok(contrast(p.brand, p.onBrand) >= 2.5 || c === "#ffffff", `${c} buton yazısı ayrışır`);
}
assert.equal(brandPalette("#facc15").onBrand, "#1d1d1f", "açık renkte buton yazısı koyu");
assert.equal(brandCss("#d42e1e"), "", "varsayılan renkte globals.css tonları kalır");
assert.match(brandCss("#0369a1"), /--color-brand:#0369a1/);
assert.equal(brandPalette("geçersiz").brand, "#d42e1e", "geçersiz renk varsayılana düşer");

// Ürün türü yer tutucuları
setNiche({ one: "dedektör", acc: "dedektörü", many: "dedektörleri", oneEn: "detector", manyEn: "detectors" });
assert.equal(translate("tr", "home.wizTitle"), "Hangi dedektör sana göre?");
assert.equal(translate("tr", "brand.title", { ad: "Minelab" }), "Minelab dedektörleri");
assert.equal(translate("tr", "footer.whichDetector"), "Hangi dedektörü almalıyım?");
assert.equal(translate("en", "brand.title", { ad: "Minelab" }), "Minelab detectors");
assert.equal(fillNiche("{Tür} sözlüğü · {Types}"), "Dedektör sözlüğü · Detectors");
setNiche({ one: "ürün", acc: "ürünü", many: "ürünleri", oneEn: "product", manyEn: "products" });
assert.equal(translate("tr", "all.metaTitle"), "Ürün Modelleri ve Fiyatları — Tüm Ürünler");
assert.equal(translate("tr", "brand.metaDesc", { ad: "Garrett" }).startsWith("Orijinal Garrett ürünleri:"), true);
assert.equal(translate("tr", "home.wizTitle"), "Hangi ürün sana göre?");
setNiche({ one: "ışık", acc: "ışığı", many: "ışıkları", oneEn: "light", manyEn: "lights" });
assert.equal(fillNiche("{Tür}"), "Işık", "Türkçe büyük harf (ı → I)");
setNiche({ one: "iğne", acc: "iğneyi", many: "iğneleri", oneEn: "needle", manyEn: "needles" });
assert.equal(fillNiche("{Tür}"), "İğne", "Türkçe büyük harf (i → İ)");

// Kapalı modül linkleri
const off = { wizard: false, glossary: false, serial: false, service: false };
assert.equal(linkAllowed("/sihirbaz?amac=define", off), false);
assert.equal(linkAllowed("/servis", off), false);
assert.equal(linkAllowed("/servis-kosullari", off), true, "benzer başlayan başka sayfa etkilenmez");
assert.equal(linkAllowed("/seri-no", { ...off, serial: true }), true);
assert.equal(linkAllowed("/urunler", off), true);

// Çok boyutlu varyantlar
assert.deepEqual(parseVariantLabel("Renk: Siyah / Beden: 42"), { Renk: "Siyah", Beden: "42" });
assert.equal(parseVariantLabel("Pro-Pack"), null);
const row = (id: string, label: string, stock = 5): VariantRow => ({ id, slug: id, name: id, label, price: 100, stock, allowBackorder: false });
const rows = [row("s40", "Renk: Siyah / Beden: 40"), row("s42", "Renk: Siyah / Beden: 42", 0), row("b40", "Renk: Beyaz / Beden: 40"), row("b44", "Renk: Beyaz / Beden: 44")];
const ax = variantAxes(rows, "s40")!;
assert.deepEqual(ax.map((a) => a.name), ["Renk", "Beden"]);
assert.deepEqual(ax[1].options.map((o) => o.value), ["40", "42", "44"]);
const renk = ax[0].options.find((o) => o.value === "Beyaz")!;
assert.equal(renk.href, "/urun/b40", "renk değişince aynı beden korunur");
const b42 = ax[1].options.find((o) => o.value === "42")!;
assert.equal(b42.available, false, "stoksuz kombinasyon işaretlenir");
const b44 = ax[1].options.find((o) => o.value === "44")!;
assert.equal(b44.exact, false, "seçili renkte olmayan beden başka renge götürür");
assert.equal(variantAxes([row("a", "Standart"), row("b", "Pro-Pack")], "a"), null, "düz adlarda tek satır");

console.log("white-label: tüm testler geçti");
