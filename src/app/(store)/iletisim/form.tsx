"use client";

import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { contactForm } from "../actions";

export function ContactForm({ subject }: { subject: string }) {
  return (
    <ActionForm action={contactForm} resetOnSuccess className="flex flex-col gap-4 rounded-2xl border border-line p-6">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <Field label="Adın"><Input name="name" required /></Field>
      <Field label="Telefon veya e-posta"><Input name="contact" required /></Field>
      <Field label="Konu"><Input name="subject" defaultValue={subject} /></Field>
      <Field label="Mesajın"><Textarea name="message" required className="min-h-[130px]" /></Field>
      <Checkbox name="kvkk" required label={<><Link href="/sayfa/kvkk-aydinlatma-metni" target="_blank" className="font-bold text-link">Aydınlatma metnini</Link> okudum.</>} />
      <SubmitButton size="lg">Gönder</SubmitButton>
    </ActionForm>
  );
}
