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
};

export function OrderTable({ rows, canManage }: { rows: Row[]; canManage: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  if (!rows.length) return <Card><EmptyState title="Sipariş yok" description="Bu filtreye uyan sipariş bulunamadı." /></Card>;
  const all = sel.length === rows.length;
  return (
    <Card>
      {canManage && sel.length ? (
        <ActionForm action={bulkStatus} onDone={() => setSel([])} className="flex flex-wrap items-center gap-2 border-b border-line bg-tint px-4 py-3">
          {sel.map((id) => <input key={id} type="hidden" name="ids" value={id} />)}
          <span className="text-sm font-bold">{sel.length} sipariş</span>
          <Select name="to" className="h-9 w-56" required defaultValue="">
            <option value="" disabled>İşlem seç…</option>
            <option value="PREPARING">Hazırlanıyor yap</option>
            <option value="DELIVERED">Teslim edildi yap</option>
          </Select>
          <SubmitButton size="sm">Uygula</SubmitButton>
          <a
            className="text-sm font-bold text-link"
            href={`/admin/yazdir?ids=${sel.join(",")}`}
            target="_blank"
          >
            Paket fişlerini yazdır
          </a>
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
                {o.channel && o.channel !== "WEB" ? <span className="ml-1.5 rounded bg-soft px-1.5 py-0.5 text-[10px] font-bold text-mute">{o.channel === "TRENDYOL" ? "Trendyol" : "Panel"}</span> : null}
                <span className="block text-xs text-mute">{formatDate(o.createdAt, true)}</span>
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
