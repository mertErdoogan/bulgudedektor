/** npx tsx tests/unit/csv.test.ts */
import assert from "node:assert/strict";
import { parseCsv, pickCol, toCsv } from "../../src/lib/csv";

const a = parseCsv('﻿Adı;Soyadı;E-Posta;Adres\r\nAli;Veli;ali@x.com;"Fulya Mah; No:5"\r\n\r\nAyşe;"Kaya ""K""";;"çok\nsatır"\n');
assert.deepEqual(a.head, ["adı", "soyadı", "e-posta", "adres"]);
assert.equal(a.rows.length, 2);
assert.equal(a.rows[0][3], "Fulya Mah; No:5");
assert.equal(a.rows[1][1], 'Kaya "K"');
assert.equal(a.rows[1][3], "çok\nsatır");
assert.equal(pickCol(a.head, a.rows[0], "ad", "adı"), "Ali");
const b = parseCsv("name,email\nX,x@y.z");
assert.deepEqual(b.rows, [["X", "x@y.z"]]);
const round = parseCsv(toCsv([["a", "b;c"], ["1", '2"3']]));
assert.deepEqual(round.rows, [["1", '2"3']]);
console.log("csv: tüm testler geçti");
