import assert from "node:assert/strict";
import { sniffOk, svgSafe } from "../../src/lib/upload-check";

const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
assert.ok(sniffOk(png, "image/png"));
assert.ok(!sniffOk(png, "image/jpeg"), "PNG baytı JPEG diye geçmez");
assert.ok(sniffOk(Buffer.from("%PDF-1.7\n"), "application/pdf"));
assert.ok(!sniffOk(Buffer.from("<html><script>"), "application/pdf"), "PDF diye HTML geçmez");
assert.ok(sniffOk(Buffer.from("RIFF\0\0\0\0WEBPVP8 "), "image/webp"));

const logo = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10"><defs><linearGradient id="g"/></defs><use xlink:href="#g"/><path fill="url(#g)" d="M0 0h10v10z"/></svg>`;
assert.ok(svgSafe(logo), "sade logo geçer");
assert.ok(svgSafe(`<!-- Generator --><svg viewBox="0 0 1 1"></svg>`));
for (const bad of [
  `<svg><script>alert(1)</script></svg>`,
  `<svg onload="alert(1)"></svg>`,
  `<svg><a href="javascript:alert(1)"><text>x</text></a></svg>`,
  `<svg><image href="https://evil.example/x.png"/></svg>`,
  `<svg><foreignObject><body/></foreignObject></svg>`,
  `<!DOCTYPE svg [<!ENTITY x "y">]><svg></svg>`,
  `<html><svg></svg></html>`,
]) assert.ok(!svgSafe(bad), bad);

console.log("upload-check: tüm testler geçti");
