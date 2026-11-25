"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Checkbox, Field, Input } from "@/components/ui";
import type { CatalogSettings } from "@/lib/settings";
import { saveCatalog } from "./actions";

/* Hazır sektör profilleri: seçince alanlar dolar, sonra istenen değiştirilebilir */
const PRESETS: { label: string; v: CatalogSettings }[] = [
  { label: "Genel mağaza", v: { nounOne: "ürün", nounAcc: "ürünü", nounMany: "ürünleri", nounOneEn: "product", nounManyEn: "products", wizard: false, glossary: false, serial: false, service: false, detectorSpecs: false } },
  { label: "Metal dedektörü", v: { nounOne: "dedektör", nounAcc: "dedektörü", nounMany: "dedektörleri", nounOneEn: "detector", nounManyEn: "detectors", wizard: true, glossary: true, serial: true, service: true, detectorSpecs: true } },
  { label: "Elektronik", v: { nounOne: "cihaz", nounAcc: "cihazı", nounMany: "cihazları", nounOneEn: "device", nounManyEn: "devices", wizard: false, glossary: false, serial: true, service: true, detectorSpecs: false } },
  { label: "Giyim / ayakkabı", v: { nounOne: "ürün", nounAcc: "ürünü", nounMany: "ürünleri", nounOneEn: "item", nounManyEn: "items", wizard: false, glossary: false, serial: false, service: false, detectorSpecs: false } },
  { label: "Outdoor / kamp", v: { nounOne: "ekipman", nounAcc: "ekipmanı", nounMany: "ekipmanları", nounOneEn: "gear item", nounManyEn: "gear", wizard: false, glossary: false, serial: false, service: false, detectorSpecs: false } },
];

const MODULES: { k: keyof CatalogSettings; label: string; hint: string }[] = [
  { k: "wizard", label: "\"Bana hangisi?\" seçim sihirbazı", hint: "Ürünlerde teknoloji, kullanım amacı gibi alanlar dolu olmalı (dedektör alanlarıyla birlikte açın)." },
  { k: "detectorSpecs", label: "Dedektöre özel ürün alanları", hint: "Teknoloji, su dayanımı, kimin için, kullanım amacı alanları ve filtreleri." },
  { k: "serial", label: "Seri no ile orijinallik sorgulama", hint: "Seri numarası takip edilen ürünlerde müşteri cihazını sorgulayabilir." },
  { k: "service", label: "Teknik servis kaydı ve sorgulama", hint: "Arızalı ürün kabulü, servis fişi ve müşterinin durum sorgulaması." },
  { k: "glossary", label: "Terimler sözlüğü sayfası", hint: "Sık sorulanlar panelindeki \"terim\" kayıtlarından oluşur." },
];

/** Ayarlar > Katalog: ürün türünün adı (metinlerde kullanılır) ve sektöre özel modüller */
export function CatalogForm({ catalog }: { catalog: CatalogSettings }) {
  const [v, setV] = useState(catalog);
  const set = (k: keyof CatalogSettings, x: string | boolean) => setV({ ...v, [k]: x });
  // key: hazır profil seçilince checkbox'ların varsayılanı da yenilensin
  const [rev, setRev] = useState(0);
  return (
    <ActionForm action={saveCatalog} className="grid gap-5 p-5" key={rev}>
      <div>
        <p className="text-sm font-bold">Hazır profil</p>
        <div className="mt-2 flex flex-wrap gap-2" data-testid="catalog-presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" onClick={() => { setV(p.v); setRev(rev + 1); }} className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold hover:border-deep">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Ürün türü (tekil)" hint="Hangi ___ sana uygun?"><Input name="nounOne" value={v.nounOne} onChange={(e) => set("nounOne", e.target.value)} required /></Field>
        <Field label="Belirtme hâli" hint="Hangi ___ almalıyım?"><Input name="nounAcc" value={v.nounAcc} onChange={(e) => set("nounAcc", e.target.value)} required /></Field>
        <Field label="Tamlama / çoğul" hint="Minelab ___, kategori ___"><Input name="nounMany" value={v.nounMany} onChange={(e) => set("nounMany", e.target.value)} required /></Field>
        <Field label="İngilizce (tekil)"><Input name="nounOneEn" value={v.nounOneEn} onChange={(e) => set("nounOneEn", e.target.value)} required /></Field>
        <Field label="İngilizce (çoğul)"><Input name="nounManyEn" value={v.nounManyEn} onChange={(e) => set("nounManyEn", e.target.value)} required /></Field>
      </div>
      <p className="rounded-lg bg-soft p-3 text-sm" data-testid="catalog-sample">
        Örnek: <b>Hangi {v.nounOne} sana uygun?</b> · <b>Hangi {v.nounAcc} almalıyım?</b> · <b>Minelab {v.nounMany}</b>
      </p>

      <div className="grid gap-3">
        <p className="text-sm font-bold">Sektöre özel modüller</p>
        {MODULES.map((m) => (
          <div key={m.k}>
            <Checkbox name={m.k} defaultChecked={!!v[m.k]} label={m.label} onChange={(e) => set(m.k, (e.target as HTMLInputElement).checked)} />
            <p className="ml-7 text-xs text-mute">{m.hint}</p>
          </div>
        ))}
        <p className="text-xs text-mute">Kapalı modüllerin sayfaları açılmaz, menü ve sayfalardaki bağlantıları otomatik gizlenir.</p>
      </div>
      <div>
        <SubmitButton>Kaydet</SubmitButton>
      </div>
    </ActionForm>
  );
}
