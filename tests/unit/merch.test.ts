/** Vitrin önceliği: marka ağırlığı, sabit ürünler, tam liste. Çalıştırma: npx tsx tests/unit/merch.test.ts */
import "dotenv/config";
import Module from "node:module";
import { join } from "node:path";
const M = Module as unknown as { _resolveFilename: (r: string, ...a: unknown[]) => string };
const orig = M._resolveFilename;
M._resolveFilename = (r, ...a) => (r === "server-only" ? join(__dirname, "../shims/server-only.js") : orig(r, ...a));

async function main() {
const { weigh } = await import("../../src/lib/merch");
const mk = (id: string, b: string) => ({ id, brandSlug: b, name: id } as never);
const F = (n: number, p = "m") => Array.from({ length: n }, (_, i) => mk(`${p}${i}`, "minelab"));
const O = (n: number) => Array.from({ length: n }, (_, i) => mk(`o${i}`, "garrett"));
const m = (w: "off" | "light" | "balanced" | "high", pinned: { productId: string; until: string | null }[] = []) => ({ focusBrand: "minelab", weight: w, pinned, badge: true, focusNote: "" });
const s = (l: { id: string }[]) => l.map((x) => (x.id.startsWith("o") ? "O" : "M")).join("");
let fail = 0;
const eq = (name: string, a: string, b: string) => { if (a !== b) { fail++; console.log("FAIL", name, a, "≠", b); } else console.log("ok  ", name, a); };
// sıralı karışık aday: O M O M ... (satışa göre)
const mixed = [O(1)[0], ...F(1), ...O(3).slice(1), ...F(9).slice(1)];
eq("dengeli 8: 6M 2O, diğerleri 3. ve 6.", s(weigh([...F(10), ...O(5)], m("balanced"), { limit: 8 })), "MMOMMOMM");
eq("yüksek 8: 7M 1O", s(weigh([...F(10), ...O(5)], m("high"), { limit: 8 })), "MMMMOMMM");
eq("kapalı: doğal sıra", s(weigh(mixed, m("off"), { limit: 6 })), s(mixed.slice(0, 6)));
eq("öncelikli yetmezse üstte toplanır (20'de 5M)", s(weigh([...O(15), ...F(5)], m("balanced"))).slice(0, 7), "MMOMOMM");
eq("öncelikli yoksa sadece diğerleri", s(weigh(O(6), m("balanced"), { limit: 4 })), "OOOO");
const pinned = weigh([...F(5), ...O(5)], m("balanced", [{ productId: "o3", until: null }]), { limit: 5 });
eq("sabit ürün başta", pinned[0].id, "o3");
const exp = weigh([...F(5), ...O(5)], m("balanced", [{ productId: "o3", until: "2000-01-01" }]), { limit: 5 });
eq("süresi geçen sabit düşer", exp[0].id, "m0");
eq("tam listede herkes kalır", String(weigh([...F(3), ...O(9)], m("high")).length), "12");
const l = weigh([...F(10), ...O(5)], m("light"), { limit: 8 });
eq("hafif 8: 3 diğer marka", String(l.filter((x) => x.brandSlug !== "minelab").length), "3");
if (fail) process.exit(1); console.log("merch: tüm testler geçti"); process.exit(0);
}
main();
