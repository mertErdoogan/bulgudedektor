"use client";

import { useState } from "react";
import { useT } from "@/components/i18n";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Turnstile } from "@/components/turnstile";
import { Stars } from "@/components/store/product-client";
import { Input, Textarea } from "@/components/ui";
import { askQuestion, stockAlert, writeReview } from "../../actions";

export function ProductForms({ productId, mode }: { productId: string; mode: "review" | "question" | "alert" }) {
  const t = useT();
  const [open, setOpen] = useState(mode === "alert");
  const [rating, setRating] = useState(5);
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="mt-3 rounded-lg border border-deep px-4 py-2.5 text-sm font-extrabold">
        {mode === "review" ? t("pf.writeReview") : t("pf.ask")}
      </button>
    );
  if (mode === "alert")
    return (
      <ActionForm action={stockAlert} resetOnSuccess className="flex gap-2 rounded-xl bg-soft p-3">
        <input type="hidden" name="productId" value={productId} />
        <Input name="contact" placeholder={t("pf.contact")} required />
        <SubmitButton variant="dark">{t("pf.notify")}</SubmitButton>
      </ActionForm>
    );
  if (mode === "review")
    return (
      <ActionForm action={writeReview} resetOnSuccess onDone={() => setOpen(false)} className="mt-4 flex flex-col gap-3 rounded-xl bg-soft p-4">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="rating" value={rating} />
        <Stars value={rating} onChange={setRating} />
        <Textarea name="body" placeholder={t("pf.reviewPh")} required minLength={10} />
        <p className="text-xs text-mute">{t("pf.reviewNote")}</p>
        <Turnstile />
        <SubmitButton className="self-start">{t("pf.send")}</SubmitButton>
      </ActionForm>
    );
  return (
    <ActionForm action={askQuestion} resetOnSuccess onDone={() => setOpen(false)} className="mt-4 grid gap-3 rounded-xl bg-soft p-4 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Input name="name" placeholder={t("pf.name")} required />
      <Input name="contact" placeholder={t("pf.contactReply")} required />
      <Textarea name="question" placeholder={t("pf.question")} required className="sm:col-span-2" />
      <Turnstile />
      <SubmitButton className="self-start">{t("pf.sendQuestion")}</SubmitButton>
    </ActionForm>
  );
}
