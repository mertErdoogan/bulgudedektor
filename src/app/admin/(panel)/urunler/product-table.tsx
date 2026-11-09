"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ProductStatusBadge } from "@/components/admin/status";
import { Badge, Card, EmptyState, Input, Select, Table, Td, Th } from "@/components/ui";
import { formatTL } from "@/lib/utils";
import { bulkProducts } from "./actions";

type Row = {
  id: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  status: string;
  isFeatured: boolean;
  brand: string | null;
  category: string | null;
  image: string | null;
};

export function ProductTable({ rows, showCost, canEdit, canDelete }: { rows: Row[]; showCost: boolean; canEdit: boolean; canDelete: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [op, setOp] = useState("");
  const all = rows.length > 0 && sel.length === rows.length;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (!rows.length) return <Card><EmptyState title="Ürün bulunamadı" description="Filtreleri temizleyin veya yeni ürün ekleyin." /></Card>;

  return (
    <Card>
      {canEdit && sel.length ? (
        <ActionForm action={bulkProducts} onDone={() => setSel([])} confirm={op === "delete" ? `${sel.length} ürün silinsin mi? Siparişi olanlar arşivlenir.` : undefined} className="flex flex-wrap items-center gap-2 border-b border-line bg-tint px-4 py-3">
          {sel.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <span className="text-sm font-bold">{sel.length} ürün seçildi</span>
          <Select name="op" value={op} onChange={(e) => setOp(e.target.value)} className="h-9 w-56" required>
            <option value="">İşlem seç…</option>
            <option value="ACTIVE">Yayına al</option>
            <option value="DRAFT">Taslağa çek</option>
            <option value="ARCHIVED">Arşivle</option>
            <option value="featured-on">Vitrine ekle</option>
            <option value="featured-off">Vitrinden çıkar</option>
            <option value="price">Fiyatı % değiştir</option>
            {canDelete ? <option value="delete">Sil</option> : null}
          </Select>
          {op === "price" ? <Input name="pct" placeholder="% (ör. 5 veya -10)" className="h-9 w-40" required /> : null}
          <SubmitButton size="sm" variant={op === "delete" ? "danger" : "primary"} pendingText="Uygulanıyor…">
            Uygula
          </SubmitButton>
          <button type="button" className="text-sm font-semibold text-mute underline" onClick={() => setSel([])}>
            Seçimi temizle
          </button>
        </ActionForm>
      ) : null}
      <Table>
        <thead>
          <tr>
            {canEdit ? (
              <Th className="w-10">
                <input type="checkbox" aria-label="Tümünü seç" className="h-4 w-4 accent-brand" checked={all} onChange={() => setSel(all ? [] : rows.map((r) => r.id))} />
              </Th>
            ) : null}
            <Th>Ürün</Th>
            <Th>Marka / kategori</Th>
            <Th className="text-right">Fiyat</Th>
            {showCost ? <Th className="text-right">Marj</Th> : null}
            <Th className="text-right">Stok</Th>
            <Th>Durum</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const margin = r.costPrice ? ((r.price / 1.2 - r.costPrice / 1.2) / (r.price / 1.2)) * 100 : null;
            return (
              <tr key={r.id} className={sel.includes(r.id) ? "bg-tint/60" : "hover:bg-soft/60"}>
                {canEdit ? (
                  <Td>
                    <input type="checkbox" aria-label={`${r.name} seç`} className="h-4 w-4 accent-brand" checked={sel.includes(r.id)} onChange={() => toggle(r.id)} />
                  </Td>
                ) : null}
                <Td>
                  <Link href={`/admin/urunler/${r.id}`} className="flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
                      {r.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.image} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <span className="text-[10px] text-mute">Görsel yok</span>
                      )}
                    </span>
                    <span>
                      <span className="block font-bold hover:text-link">{r.name}</span>
                      <span className="text-xs text-mute">{r.sku}</span>
                      {r.isFeatured ? <Badge tone="brand" className="ml-2">Vitrin</Badge> : null}
                    </span>
                  </Link>
                </Td>
                <Td className="text-mute">
                  {r.brand ?? "—"}
                  <br />
                  <span className="text-xs">{r.category ?? "Kategorisiz"}</span>
                </Td>
                <Td className="text-right font-bold">{formatTL(r.price)}</Td>
                {showCost ? <Td className="text-right text-mute">{margin === null ? "—" : `%${margin.toFixed(0)}`}</Td> : null}
                <Td className="text-right">
                  <Badge tone={r.stock <= 0 ? "danger" : r.stock <= r.lowStockThreshold ? "warn" : "neutral"}>{r.stock}</Badge>
                </Td>
                <Td>
                  <ProductStatusBadge status={r.status} />
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
