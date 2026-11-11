"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Modal } from "@/components/admin/modal";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { importTracking } from "./actions";

/** Kargo firmasının gün sonu listesinden takip numaralarını toplu girme. */
export function ImportTracking({ carriers }: { carriers: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Truck size={16} /> Takip no yükle
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Takip numaralarını toplu gir">
        <ActionForm action={importTracking} onDone={() => setOpen(false)} className="flex flex-col gap-4">
          <p className="text-sm text-mute">
            Her satıra <b>sipariş no ; takip no</b> yazın (isterseniz üçüncü sütuna kargo firması). Kargo firmasının gün sonu Excel listesini CSV olarak da yükleyebilirsiniz. Siparişler &quot;Kargoya verildi&quot; olur, müşteriye e-posta ve SMS gider.
          </p>
          <Field label="Varsayılan kargo firması">
            <Select name="carrier" defaultValue={carriers[0]}>
              {carriers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Satırlar">
            <Textarea name="text" rows={6} placeholder={"1042;7300012345678\n1043;7300012345679;Aras Kargo"} className="font-mono text-sm" />
          </Field>
          <Field label="veya CSV dosyası">
            <input type="file" name="file" accept=".csv,.txt,text/csv" className="text-sm" />
          </Field>
          <SubmitButton pendingText="İşleniyor…">Kargoya verildi yap</SubmitButton>
        </ActionForm>
      </Modal>
    </>
  );
}
