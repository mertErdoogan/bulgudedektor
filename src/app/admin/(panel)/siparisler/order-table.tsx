"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status";
import { Badge, Card, EmptyState, Select, Table, Td, Th } from "@/components/ui";
import { formatDate, formatTL, orderNo } from "@/lib/utils";
import { bulkStatus } from "./actions";

type Row = {
  id: string;
  number: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  deliveryMethod: string;
  channel?: string;
  total: number;
  createdAt: Date;
  shippingAddress: { fullName: string; city: string };
  items: { name: string; quantity: number }[];
  assignee?: { name: string } | null;
};

export function OrderTable({ rows, canManage, team = [], me = "", carriers = [] }: { rows: Row[]; canManage: boolean; team?: { id: string; name: string }[]; me?: string; carriers?: string[] }) {
  const [sel, setSel] = useState<string[]>([]);
  const [to, setTo] = useState("");
  if (!rows.length) return <Card><EmptyState title="Sipariş yok" description="Bu filtreye uyan sipariş bulunamadı." /></Card>;
  const all = sel.length === rows.length;
  return (
    <Card>
      {canManage && sel.length ? (
        <ActionForm action={bulkStatus} onDone={() => { setSel([]); setTo(""); }} className="flex flex-col gap-3 border-b border-line bg-tint px-4 py-3">
          {sel.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">{sel.length} sipariş seçildi</span>
            <Select name="to" className="h-9 w-56" required value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="" disabled>İşlem seç…</option>
              <optgroup label="Durum">
                <option value="PREPARING">Hazırlanıyor yap</option>
                <option value="SHIPPED">Kargoya verildi yap…</option>
                <option value="DELIVERED">Teslim edildi yap</option>
              </optgroup>
              <optgroup label="Atama">
                <option value="ASSIGN_ME">Bana ata</option>
                {team.filter((u) => u.id !== me).map((u) => <option key={u.id} value={`ASSIGN:${u.id}`}>{u.name} kişisine ata</option>)}
                <option value="UNASSIGN">Atamayı kaldır</option>
              </optgroup>
            </Select>
            {to === "SHIPPED" ? (
              <Select name="carrier" className="h-9 w-44" required defaultValue={carriers[0]}>
                {carriers.map((c) => <option key={c}>{c}</option>)}
              </Select>
            ) : null}
            <SubmitButton size="sm">Uygula</SubmitButton>
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <span className="text-sm text-mute">Yazdır:</span>
            {[
              ["", "Paket fişi"],
              ["toplama", "Toplama listesi"],
              ["etiket", "Adres etiketi"],
            ].map(([t, label]) => (
              <a key={t} className="text-sm font-bold text-link" href={`/admin/yazdir?ids=${sel.join(",")}${t ? `&tur=${t}` : ""}`} target="_blank">
                {label}
              </a>
            ))}
          </div>
          {to === "SHIPPED" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.filter((r) => sel.includes(r.id)).map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="w-28 shrink-0 truncate font-semibold" title={r.shippingAddress.fullName}>{orderNo(r.number)}</span>
                  <input
                    name={`tracking_${r.id}`}
                    placeholder={r.deliveryMethod === "PICKUP" ? "Mağazadan teslim" : "Takip no"}
                    required={r.deliveryMethod !== "PICKUP"}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-2 font-mono text-sm"
                  />
                </label>
              ))}
            </div>
          ) : null}
        </ActionForm>
      ) : null}
      <Table>
        <thead>
          <tr>
            {canManage ? (
              <Th className="w-10">
                <input type="checkbox" aria-label="Tümünü seç" className="h-4 w-4 accent-brand" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} />
              </Th>
            ) : null}
            <Th>Sipariş</Th>
            <Th>Müşteri</Th>
            <Th>Ürünler</Th>
            <Th>Ödeme</Th>
            <Th>Durum</Th>
            <Th className="text-right">Tutar</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className={sel.includes(o.id) ? "bg-tint/60" : "hover:bg-soft/60"}>
              {canManage ? (
                <Td>
                  <input type="checkbox" aria-label={`${orderNo(o.number)} seç`} className="h-4 w-4 accent-brand" checked={sel.includes(o.id)} onChange={() => setSel((s) => (s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id]))} />
                </Td>
              ) : null}
              <Td>
                <Link href={`/admin/siparisler/${o.id}`} className="font-bold text-link">{orderNo(o.number)}</Link>
                {o.channel && o.channel !== "WEB" ? <span className="ml-1.5 rounded bg-soft px-1.5 py-0.5 text-[10px] font-bold text-mute">{o.channel === "TRENDYOL" ? "Trendyol" : o.channel === "HEPSIBURADA" ? "Hepsiburada" : "Panel"}</span> : null}
                <span className="block text-xs text-mute">{formatDate(o.createdAt, true)}{o.assignee ? <> · <b className="text-deep">{o.assignee.name.split(" ")[0]}</b></> : null}</span>
              </Td>
              <Td>
                {o.shippingAddress.fullName}
                <span className="block text-xs text-mute">{o.deliveryMethod === "PICKUP" ? "Showroom teslim" : o.shippingAddress.city}</span>
              </Td>
              <Td className="max-w-[260px] truncate text-mute">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</Td>
              <Td>
                <PaymentStatusBadge status={o.paymentStatus} /> <Badge>{o.paymentMethod === "CARD" ? "Kart" : "Havale"}</Badge>
              </Td>
              <Td><OrderStatusBadge status={o.status} /></Td>
              <Td className="text-right font-bold">{formatTL(o.total)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
