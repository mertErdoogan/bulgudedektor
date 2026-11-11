/** npx tsx tests/unit/sanitize.test.ts — içerik HTML'inde XSS denemeleri temizlenmeli */
import assert from "node:assert/strict";
import { renderContent } from "../../src/lib/markdown";

const attacks = [
  `<p>a</p><script>alert(1)</script>`,
  `<p onclick=alert(1)>x</p>`,
  `<p onmouseover='alert(1)'>x</p>`,
  `<img src=x onerror=alert(1)>`,
  `<a href="javascript:alert(1)">t</a>`,
  `<a href="JaVaScRiPt:alert(1)">t</a>`,
  `<svg onload=alert(1)></svg>`,
  `<iframe src="https://kotu.example"></iframe>`,
  `<p style="background:url(javascript:alert(1))">x</p>`,
  `<form action="https://kotu.example"><input name=p></form>`,
  `<a href="//kotu.example">t</a>`,
  `<img src="data:image/svg+xml;base64,PHN2Zz4=">`,
];
for (const a of attacks) {
  const out = renderContent(a).toLowerCase();
  assert.ok(!/<script|onerror|onload|onclick|onmouseover|javascript:|<iframe|<svg|<form|style=|\/\/kotu|data:/.test(out), `temizlenmedi: ${a} → ${out}`);
}
// Meşru içerik korunur
const ok = renderContent(`<h2 id="x">Başlık</h2><p>Metin <a href="https://www.minelab.com">link</a></p><table><tr><td>1</td></tr></table>`);
assert.match(ok, /<h2 id="x">Başlık<\/h2>/);
assert.match(ok, /href="https:\/\/www\.minelab\.com"/);
assert.match(ok, /rel="noopener noreferrer"/);
assert.match(ok, /<td>1<\/td>/);
// Markdown yolu zaten kaçışlı
assert.ok(!renderContent("**a** <script>x</script>").includes("<script"));
console.log("sanitize: tüm testler geçti");
