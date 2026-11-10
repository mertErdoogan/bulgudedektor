"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Button } from "@/components/ui";
import { Modal } from "@/components/admin/modal";
import { importCustomersCsv } from "./actions";

export function ImportCustomers() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload size={16} /> İçe aktar
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Müşterileri içe aktar (CSV)">
        <ActionForm action={importCustomersCsv} onDone={() => setOpen(false)} className="flex flex-col gap-4">
          <div className="space-y-2 text-sm text-mute">
            <p>
              Eski sitenin (Efortek) yönetim panelinden üye listesini Excel/CSV olarak alıp buraya yükleyin. Excel dosyasını önce <b>Farklı Kaydet → CSV (UTF-8)</b> ile kaydedin.
            </p>
            <p>
              Tanınan sütunlar: <b>Ad, Soyad</b> (ya da Ad Soyad), <b>E-posta, Telefon/GSM</b>, isteğe bağlı <b>İl, İlçe, Adres</b> ve <b>İzin/Bülten</b>. Var olan e-posta veya telefon atlanır.
            </p>
            <p>Şifreler taşınamaz; müşteriler ilk girişte &quot;Şifremi unuttum&quot; ile yeni şifre belirler. Aktarılanlar &quot;Eski site&quot; etiketi alır.</p>
          </div>
          <input type="file" name="file" accept=".csv,text/csv" required className="text-sm" />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consent" className="mt-1" />
            <span>
              Dosyadaki ticari ileti izinlerini de aktar. <span className="text-mute">Yalnızca izinlerin eski sitede açıkça alındığından eminseniz işaretleyin (İYS kaydı ayrıca gerekir).</span>
            </span>
          </label>
          <SubmitButton pendingText="İçe aktarılıyor…">İçe aktar</SubmitButton>
        </ActionForm>
      </Modal>
    </>
  );
}
