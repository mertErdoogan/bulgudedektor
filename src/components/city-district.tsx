"use client";

import { useEffect, useState } from "react";
import { Field, Select } from "@/components/ui";

type Data = Record<string, string[]>;
let cache: Data | null = null;
const norm = (s: string) => s.toLocaleLowerCase("tr-TR").trim();

/** İl ve ilçe açılır listeleri (81 il, 973 ilçe). Liste yüklenemezse kayıtlı değerler tek seçenek olarak kalır. */
export function CityDistrict({ city = "", district = "", required = true, labels = true }: { city?: string; district?: string; required?: boolean; labels?: boolean }) {
  const [data, setData] = useState<Data | null>(cache);
  const [c, setC] = useState(city);
  const [d, setD] = useState(district);
  useEffect(() => {
    if (cache) return;
    fetch("/data/il-ilce.json")
      .then((r) => r.json())
      .then((j: Data) => {
        cache = j;
        setData(j);
      })
      .catch(() => {});
  }, []);
  // Serbest yazılmış eski kayıtları ("istanbul", "ISTANBUL") listedeki adla eşleştir
  useEffect(() => {
    if (!data) return;
    const mc = Object.keys(data).find((k) => norm(k) === norm(c));
    if (mc && mc !== c) setC(mc);
    const md = mc ? data[mc].find((k) => norm(k) === norm(d)) : undefined;
    if (md && md !== d) setD(md);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const cities = data ? Object.keys(data) : c ? [c] : [];
  const districts = data?.[c] ?? (d ? [d] : []);
  const citySel = (
    <Select name="city" value={c} required={required} autoComplete="address-level1" onChange={(e) => { setC(e.target.value); setD(""); }}>
      <option value="">İl seç</option>
      {c && !cities.includes(c) ? <option value={c}>{c}</option> : null}
      {cities.map((x) => <option key={x} value={x}>{x}</option>)}
    </Select>
  );
  const distSel = (
    <Select name="district" value={d} required={required} autoComplete="address-level2" disabled={!c} onChange={(e) => setD(e.target.value)}>
      <option value="">{c ? "İlçe seç" : "Önce il seç"}</option>
      {d && !districts.includes(d) ? <option value={d}>{d}</option> : null}
      {districts.map((x) => <option key={x} value={x}>{x}</option>)}
    </Select>
  );
  return labels ? (
    <>
      <Field label="İl">{citySel}</Field>
      <Field label="İlçe">{distSel}</Field>
    </>
  ) : (
    <>
      {citySel}
      {distSel}
    </>
  );
}
