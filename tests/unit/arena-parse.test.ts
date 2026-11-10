/** npx tsx tests/unit/arena-parse.test.ts — eski site ayrıştırıcısının sabit örneklerle testi */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { displayName, guessSpecs, parseCategoryPage, parseProduct, parseSitemap, parseTL } from "../../scripts/lib/arena-parse";

const fx = (f: string) => readFileSync(join(__dirname, "../fixtures/arena", f), "utf8");
const B = "https://www.arenadedektor.com";

assert.equal(parseTL("39.468,00 TL"), 39468);

const a = parseProduct(fx("v460.html"), "/urun/minelab-vanquish-460-dedektor", B)!;
assert.equal(a.slug, "minelab-vanquish-460-dedektor");
assert.equal(a.name, "Minelab Vanquish 460 Dedektör");
assert.equal(a.brand, "Minelab");
assert.equal(a.code, "3820-0007");
assert.equal(a.price, 39468);
assert.equal(a.inStock, true);
assert.equal(a.isNew, true);
assert.match(a.gift ?? "", /Pro Find 15/);
assert.doesNotMatch(a.gift ?? "", /Sepete dahil/);
assert.deepEqual(a.images, [`${B}/Images/Urun/01062026111238.webp`, `${B}/Images/Urun/01062026111246.webp`]);
assert.equal(a.title, "Minelab Vanquish 460 Metal Dedektörü | Orijinal Ürün");
assert.match(a.metaDescription ?? "", /Multi-IQ/);
assert.doesNotMatch(a.descriptionMd, /Güvenli Alışveriş/);
assert.match(a.descriptionMd, /## Minelab Vanquish 460/);
assert.match(a.descriptionMd, /\| Ağırlık \| 1,2 kg \|/);
assert.doesNotMatch(a.descriptionMd, /x\.jpg/);

const b = parseProduct(fx("v440.html"), "/urun/minelab-vanquish-440-dedektor", B)!;
assert.equal(b.inStock, false);
assert.equal(b.gift, null);
assert.equal(b.metaDescription, null, "genel meta açıklaması boş sayılmalı");
assert.equal(b.descriptionMd.trim(), "");

const c = parseCategoryPage(fx("kategori.html"));
assert.deepEqual(c.links, ["/urun/garrett-pro-pointer-2", "/urun/minelab-pro-find-15"]);
assert.equal(c.maxPage, 3);

assert.deepEqual(parseSitemap(fx("sitemap.xml")), ["/urun/minelab-vanquish-460-dedektor", "/kategori/pointer-dedektorler", "/blog/kategori/rehber"]);

assert.equal(displayName("Minelab Vanquish 460 Dedektör", "Minelab"), "Vanquish 460");
assert.equal(guessSpecs("Multi-IQ IP68 tam su geçirmez", false).waterproof, "FULL");

console.log("arena-parse: tüm testler geçti");
