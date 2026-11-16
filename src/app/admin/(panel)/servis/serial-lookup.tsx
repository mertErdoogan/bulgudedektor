"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { lookupSerial } from "./actions";

/**
 * Servis kaydında ilk alan: seri numarası. Okutulunca satıştan müşteri adı, telefonu ve ürün kendiliğinden dolar,
 * garanti durumu gösterilir. Bulunamazsa alanlar elle doldurulur.
 */
export function SerialLookup() {
  const [info, setInfo] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "warn" | "mute">("mute");
  const fill = (form: HTMLFormElement | null, name: string, v: string) => {
    const el = form?.elements.namedItem(name) as HTMLInputElement | null;
    if (el && v && !el.value) el.value = v;
  };
  return (
    <div className="flex flex-col gap-1.5">
      <Input
        name="serial"
        className="font-mono"
        placeholder="Seri numarasını okut (varsa)"
        autoFocus
        data-testid="svc-serial"
        onBlur={async (e) => {
          const v = e.currentTarget.value.trim();
          const form = e.currentTarget.form;
          if (v.length < 4) return setInfo(null);
          const r = await lookupSerial(v);
          if (!r) {
            setTone("warn");
            return setInfo("Bu seri numarası sistemde yok: başka yerden alınmış olabilir. Bilgileri elle gir.");
          }
          fill(form, "productName", r.productName);
          fill(form, "contactName", r.contactName);
          fill(form, "contact", r.contact);
          const inWarranty = r.warrantyUntil ? new Date(r.warrantyUntil) > new Date() : null;
          const box = form?.elements.namedItem("underWarranty") as HTMLInputElement | null;
          if (box && inWarranty !== null) box.checked = inWarranty;
          setTone(inWarranty ? "ok" : "warn");
          setInfo(
            r.warrantyUntil
              ? `${r.productName} · garanti ${inWarranty ? "devam ediyor" : "bitmiş"} (${formatDate(new Date(r.warrantyUntil))})${r.contactName ? ` · satış: ${r.contactName}` : ""}`
              : `${r.productName} · henüz satılmamış görünüyor (stokta).`,
          );
        }}
      />
      {info ? (
        <p className={`text-xs font-semibold ${tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-mute"}`} data-testid="svc-serial-info">
          {info}
        </p>
      ) : null}
    </div>
  );
}
