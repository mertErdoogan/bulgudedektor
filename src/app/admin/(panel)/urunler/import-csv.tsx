"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui";
import { Modal } from "@/components/admin/modal";
import { importProductsCsv } from "./actions";

export function ImportCsv() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} /> CSV ile güncelle
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="CSV ile toplu güncelle">
        <ActionForm action={importProductsCsv} onDone={() => setOpen(false)} className="flex flex-col gap-4">
          <p className="text-sm text-mute">
            İlk satır başlık olmalı. Zorunlu sütun: <b>sku</b>. İsteğe bağlı: <b>name, price, compare_at_price, cost_price, stock, status</b> (DRAFT / ACTIVE / ARCHIVED).
            Var olan SKU güncellenir, olmayan SKU taslak ürün olarak eklenir. En kolay yol: önce &quot;CSV indir&quot; ile mevcut listeyi alıp Excel&apos;de düzenlemek.
          </p>
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <SubmitButton pendingText="İçe aktarılıyor…">İçe aktar</SubmitButton>
        </ActionForm>
      </Modal>
    </>
  );
}
