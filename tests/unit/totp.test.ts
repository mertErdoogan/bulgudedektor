/** npx tsx tests/unit/totp.test.ts — RFC 6238 ek B test vektörleri (SHA-1, "12345678901234567890") */
import assert from "node:assert/strict";
import { base32Decode, base32Encode, openSecret, sealSecret, totpAt, verifyTotp } from "../../src/lib/totp";

const secret = base32Encode(Buffer.from("12345678901234567890"));
assert.equal(secret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
assert.equal(base32Decode(secret).toString(), "12345678901234567890");
// RFC değerleri 8 hanelidir; 6 haneli kod son 6 hanedir
for (const [t, code8] of [[59, "94287082"], [1111111109, "07081804"], [1234567890, "89005924"], [2000000000, "69279037"]] as const) {
  assert.equal(totpAt(secret, Math.floor(t / 30)), code8.slice(2));
}
const now = 1111111109 * 1000;
assert.equal(verifyTotp(secret, "081804", now), Math.floor(1111111109 / 30));
assert.notEqual(verifyTotp(secret, totpAt(secret, Math.floor(now / 30000) - 1), now), null, "30 sn önceki kod kabul edilmeli");
assert.equal(verifyTotp(secret, totpAt(secret, Math.floor(now / 30000) - 3), now), null, "eski kod reddedilmeli");
assert.equal(verifyTotp(secret, "12345", now), null);
const sealed = sealSecret(secret);
assert.notEqual(sealed, secret);
assert.equal(openSecret(sealed), secret);
assert.equal(openSecret(sealed.slice(0, -2) + "xx"), null, "bozulmuş şifreli metin açılmamalı");
console.log("totp: tüm testler geçti");
