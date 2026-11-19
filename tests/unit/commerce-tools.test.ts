/** Paket indirimi ve BirFatura tarih biçimi. Çalıştırma: npx tsx tests/unit/commerce-tools.test.ts */
import "dotenv/config";
import assert from "node:assert/strict";
import Module from "node:module";
import { join } from "node:path";
const M = Module as unknown as { _resolveFilename: (r: string, ...a: unknown[]) => string };
const orig = M._resolveFilename;
M._resolveFilename = (r, ...a) => (r === "server-only" ? join(__dirname, "../shims/server-only.js") : orig(r, ...a));

async function main() {
  const { bundleSetDiscount, bundleLive } = await import("../../src/lib/pricing");
  assert.equal(bundleSetDiscount({ discountType: "PERCENT", discountValue: 8 }, 154431), 12354, "yüzde tam TL'ye yuvarlanır");
  assert.equal(bundleSetDiscount({ discountType: "FIXED", discountValue: 1500 }, 62339), 1500);
  assert.equal(bundleSetDiscount({ discountType: "FIXED", discountValue: 99999 }, 500), 500, "sabit indirim paket fiyatını aşamaz");
  assert.equal(bundleSetDiscount({ discountType: "PERCENT", discountValue: 150 }, 1000), 900, "yüzde en fazla 90");
  assert.equal(bundleSetDiscount({ discountType: "PERCENT", discountValue: 10 }, 0), 0);
  const now = new Date("2026-11-19T10:00:00Z");
  assert.equal(bundleLive({ isActive: true, startsAt: null, endsAt: null }, now), true);
  assert.equal(bundleLive({ isActive: false, startsAt: null, endsAt: null }, now), false);
  assert.equal(bundleLive({ isActive: true, startsAt: new Date("2026-11-20T00:00:00Z"), endsAt: null }, now), false, "başlamamış");
  assert.equal(bundleLive({ isActive: true, startsAt: null, endsAt: new Date("2026-11-18T00:00:00Z") }, now), false, "bitmiş");

  const { parseBfDate, bfDate } = await import("../../src/lib/einvoice/birfatura");
  const d = parseBfDate("16.07.2026 14:27:09")!;
  assert.equal(d.toISOString(), "2026-07-16T11:27:09.000Z", "İstanbul saati UTC'ye çevrilir");
  assert.equal(bfDate(d), "16.07.2026 14:27:09", "geri biçimlendirme");
  assert.equal(parseBfDate("2026-07-16"), null, "başka biçim reddedilir");
  assert.equal(parseBfDate("01.07.2026")?.toISOString(), "2026-06-30T21:00:00.000Z", "saatsiz tarih gün başı");
  console.log("ok commerce-tools");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
