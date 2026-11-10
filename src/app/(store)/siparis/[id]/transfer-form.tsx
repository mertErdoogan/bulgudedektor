"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { notifyTransfer } from "../actions";

export function TransferForm({ orderId, k, defaultName }: { orderId: string; k: string; defaultName: string }) {
  return (
    <ActionForm action={notifyTransfer} className="mt-4 grid gap-3 border-t border-accent/20 pt-4 sm:grid-cols-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="k" value={k} />
      <p className="font-bold sm:col-span-2">Ödemeyi yaptın mı? Bize bildir, daha hızlı onaylayalım.</p>
      <Field label="Gönderen ad soyad"><Input name="sender" defaultValue={defaultName} required /></Field>
      <Field label="Dekont (isteğe bağlı)" hint="JPG, PNG veya PDF · en fazla 5 MB"><input type="file" name="receipt" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm" /></Field>
      <Field label="Not (isteğe bağlı)" className="sm:col-span-2"><Input name="note" placeholder="Örn. farklı bir hesaptan gönderdim" /></Field>
      <SubmitButton className="sm:col-span-2 sm:justify-self-start">Ödemeyi yaptım</SubmitButton>
    </ActionForm>
  );
}
