"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Stars } from "@/components/store/product-client";
import { Input, Textarea } from "@/components/ui";
import { askQuestion, stockAlert, writeReview } from "../../actions";

export function ProductForms({ productId, mode }: { productId: string; mode: "review" | "question" | "alert" }) {
  const [open, setOpen] = useState(mode === "alert");
  const [rating, setRating] = useState(5);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-3 rounded-lg border border-deep px-4 py-2.5 text-sm font-extrabold">
        {mode === "review" ? "Yorum yaz" : "Soru sor"}
      </button>
    );
  if (mode === "alert")
    return (
      <ActionForm action={stockAlert} resetOnSuccess className="flex gap-2 rounded-xl bg-soft p-3">
        <input type="hidden" name="productId" value={productId} />
        <Input name="contact" placeholder="E-posta veya telefon" required />
        <SubmitButton variant="dark">Gelince haber ver</SubmitButton>
      </ActionForm>
    );
  if (mode === "review")
    return (
      <ActionForm action={writeReview} resetOnSuccess onDone={() => setOpen(false)} className="mt-4 flex flex-col gap-3 rounded-xl bg-soft p-4">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="rating" value={rating} />
        <Stars value={rating} onChange={setRating} />
        <Textarea name="body" placeholder="Cihazı nerede, nasıl kullandın? Neyi beğendin, neyi beğenmedin?" required minLength={10} />
        <p className="text-xs text-mute">Yorum yazmak için giriş yapman gerekir. Satın alan müşterilerin yorumları &quot;Doğrulanmış alıcı&quot; olarak işaretlenir.</p>
        <Turnstile />
        <SubmitButton className="self-start">Gönder</SubmitButton>
      </ActionForm>
    );
  return (
    <ActionForm action={askQuestion} resetOnSuccess onDone={() => setOpen(false)} className="mt-4 grid gap-3 rounded-xl bg-soft p-4 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Input name="name" placeholder="Adın" required />
      <Input name="contact" placeholder="E-posta veya telefon (yanıt için)" required />
      <Textarea name="question" placeholder="Sorun" required className="sm:col-span-2" />
      <Turnstile />
      <SubmitButton className="self-start">Soruyu gönder</SubmitButton>
    </ActionForm>
  );
}
