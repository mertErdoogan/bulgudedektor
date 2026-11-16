"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { formatTL } from "@/lib/utils";

/** Kasada sayılan nakit ile sistemdeki nakit satış toplamını karşılaştırır (açılış bakiyesi dahil). */
export function CashCount({ expected }: { expected: number }) {
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const num = (v: string) => Number(v.replace(/\./g, "").replace(",", ".")) || 0;
  const should = expected + num(opening);
  const diff = counted ? num(counted) - should : null;
  return (
    <div className="flex flex-col gap-3 p-5 text-sm" data-testid="cash-count">
      <label className="grid grid-cols-[1fr_160px] items-center gap-3">
        <span>Sabah kasadaki nakit (açılış)</span>
        <Input value={opening} onChange={(e) => setOpening(e.target.value)} inputMode="decimal" placeholder="0" />
      </label>
      <div className="grid grid-cols-[1fr_160px] items-center gap-3">
        <span>Bugünkü nakit satış</span>
        <b className="text-right">{formatTL(expected)}</b>
      </div>
      <div className="grid grid-cols-[1fr_160px] items-center gap-3 border-t border-line pt-3">
        <span className="font-bold">Kasada olması gereken</span>
        <b className="text-right">{formatTL(should)}</b>
      </div>
      <label className="grid grid-cols-[1fr_160px] items-center gap-3">
        <span>Sayılan nakit</span>
        <Input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="decimal" placeholder="Say ve yaz" data-testid="cash-counted" />
      </label>
      {diff !== null ? (
        <p className={`rounded-lg p-3 font-bold ${Math.abs(diff) < 1 ? "bg-ok-bg text-ok" : "bg-danger/10 text-danger"}`} data-testid="cash-diff">
          {Math.abs(diff) < 1 ? "Kasa tutuyor." : diff > 0 ? `Kasada ${formatTL(diff)} fazla var.` : `Kasada ${formatTL(-diff)} eksik var.`}
          {Math.abs(diff) >= 1 ? " Sisteme girilmemiş bir satış ya da yanlış ödeme yöntemi olabilir." : ""}
        </p>
      ) : null}
      <p className="text-xs text-mute">Bu sayım kaydedilmez; yalnızca karşılaştırma içindir. POS gün sonu fişindeki toplam, yukarıdaki &quot;Kart · POS cihazı&quot; ile aynı olmalı.</p>
    </div>
  );
}
